-- RetailManager — Schema do banco de dados
-- Execute no SQL Editor do Supabase

-- ============================================================
-- TABELAS PRINCIPAIS
-- ============================================================

CREATE TABLE categorias (
  id         SERIAL PRIMARY KEY,
  nome       VARCHAR(100) NOT NULL UNIQUE,
  descricao  TEXT,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fornecedores (
  id             SERIAL PRIMARY KEY,
  nome           VARCHAR(200) NOT NULL,
  cnpj           VARCHAR(18) UNIQUE,
  email          VARCHAR(200),
  telefone       VARCHAR(20),
  prazo_entrega  INTEGER DEFAULT 7,     -- dias úteis
  ativo          BOOLEAN DEFAULT TRUE,
  criado_em      TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE produtos (
  id             SERIAL PRIMARY KEY,
  sku            VARCHAR(50) NOT NULL UNIQUE,
  nome           VARCHAR(200) NOT NULL,
  descricao      TEXT,
  categoria_id   INTEGER REFERENCES categorias(id),
  fornecedor_id  INTEGER REFERENCES fornecedores(id),
  preco_custo    NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_venda    NUMERIC(10,2) NOT NULL DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 5,
  ativo          BOOLEAN DEFAULT TRUE,
  criado_em      TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lojas (
  id        SERIAL PRIMARY KEY,
  nome      VARCHAR(100) NOT NULL,
  codigo    VARCHAR(20) UNIQUE,
  cidade    VARCHAR(100),
  ativo     BOOLEAN DEFAULT TRUE
);

CREATE TABLE estoque (
  id          SERIAL PRIMARY KEY,
  produto_id  INTEGER NOT NULL REFERENCES produtos(id),
  loja_id     INTEGER NOT NULL REFERENCES lojas(id),
  quantidade  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (produto_id, loja_id)
);

CREATE TABLE pedidos (
  id             SERIAL PRIMARY KEY,
  numero         VARCHAR(20) NOT NULL UNIQUE,
  tipo           VARCHAR(20) NOT NULL CHECK (tipo IN ('compra','venda','transferencia')),
  fornecedor_id  INTEGER REFERENCES fornecedores(id),
  loja_id        INTEGER REFERENCES lojas(id),
  status         VARCHAR(30) NOT NULL DEFAULT 'rascunho'
                 CHECK (status IN ('rascunho','confirmado','em_transito','entregue','cancelado')),
  total          NUMERIC(12,2) DEFAULT 0,
  observacoes    TEXT,
  criado_em      TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pedido_itens (
  id          SERIAL PRIMARY KEY,
  pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id  INTEGER NOT NULL REFERENCES produtos(id),
  quantidade  INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unit  NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- MOVIMENTAÇÃO DE ESTOQUE (auditoria)
-- ============================================================

CREATE TABLE movimentacoes_estoque (
  id           SERIAL PRIMARY KEY,
  produto_id   INTEGER NOT NULL REFERENCES produtos(id),
  loja_id      INTEGER NOT NULL REFERENCES lojas(id),
  tipo         VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada','saida','ajuste','transferencia')),
  quantidade   INTEGER NOT NULL,
  referencia   VARCHAR(50),   -- número do pedido, etc.
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================

-- Atualiza atualizado_em automaticamente
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fornecedores_upd BEFORE UPDATE ON fornecedores
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_produtos_upd BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_pedidos_upd BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Recalcula total do pedido ao inserir/atualizar itens
CREATE OR REPLACE FUNCTION recalcular_total_pedido()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pedidos
  SET total = (
    SELECT COALESCE(SUM(quantidade * preco_unit), 0)
    FROM pedido_itens WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
  )
  WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalcular_total
AFTER INSERT OR UPDATE OR DELETE ON pedido_itens
FOR EACH ROW EXECUTE FUNCTION recalcular_total_pedido();

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- Estoque consolidado com alertas
CREATE VIEW vw_estoque_consolidado AS
SELECT
  p.id AS produto_id,
  p.sku,
  p.nome AS produto,
  p.estoque_minimo,
  SUM(e.quantidade) AS total_estoque,
  CASE
    WHEN SUM(e.quantidade) = 0            THEN 'zerado'
    WHEN SUM(e.quantidade) < p.estoque_minimo THEN 'critico'
    WHEN SUM(e.quantidade) < p.estoque_minimo * 2 THEN 'baixo'
    ELSE 'normal'
  END AS status_estoque
FROM produtos p
LEFT JOIN estoque e ON e.produto_id = p.id
WHERE p.ativo = TRUE
GROUP BY p.id, p.sku, p.nome, p.estoque_minimo;

-- ============================================================
-- DADOS DE EXEMPLO
-- ============================================================

INSERT INTO categorias (nome) VALUES
  ('Vestuário'), ('Calçados'), ('Acessórios'), ('Eletrônicos');

INSERT INTO lojas (nome, codigo, cidade) VALUES
  ('Loja Centro',  'LC01', 'São Paulo'),
  ('Loja Norte',   'LN01', 'São Paulo'),
  ('Loja Sul',     'LS01', 'São Paulo');

INSERT INTO fornecedores (nome, cnpj, email, prazo_entrega) VALUES
  ('Têxtil Sul Ltda',   '12.345.678/0001-90', 'contato@textilsul.com', 7),
  ('Calçados Norte S.A.','98.765.432/0001-10', 'vendas@calcnorte.com', 14),
  ('Acessórios BR',     '55.123.456/0001-77', 'pedidos@acessbr.com',  10);
