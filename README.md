# RetailManager — CRUD de Gestão de Varejo

Painel completo para gestão de **produtos, estoque, fornecedores e pedidos**, construído com FastAPI + Supabase (PostgreSQL) + HTML/JS puro.

> Desenvolvido como portfólio. Adaptável para qualquer segmento de negócio.

---

## Funcionalidades

| Módulo | Operações |
|---|---|
| Produtos | Criar, listar, editar, desativar (soft delete) |
| Estoque | Visualizar por loja, ajustar quantidade, alertas de mínimo |
| Fornecedores | Cadastro completo com CNPJ, contato, prazo de entrega |
| Pedidos | Ciclo completo: rascunho → confirmado → entregue |
| Relatórios | KPIs de giro, cobertura, ticket médio (read-only) |

## Stack

- **Backend:** Python 3.11+ · FastAPI · Pydantic v2 · Supabase-py
- **Banco:** Supabase (PostgreSQL hospedado)
- **Frontend:** HTML5 · CSS3 · JavaScript puro (sem frameworks)
- **Deploy:** Railway (backend) · GitHub Pages (frontend)

## Estrutura

```
retail-manager/
├── backend/
│   ├── app/
│   │   ├── main.py          # App FastAPI + CORS
│   │   ├── database.py      # Conexão Supabase
│   │   ├── models/          # Modelos SQLAlchemy (opcional)
│   │   ├── schemas/         # Schemas Pydantic
│   │   └── routers/         # produtos, estoque, fornecedores, pedidos
│   └── requirements.txt
├── frontend/
│   ├── index.html           # SPA principal
│   ├── css/style.css
│   └── js/
│       ├── api.js           # Camada de acesso à API
│       ├── produtos.js
│       ├── estoque.js
│       ├── fornecedores.js
│       └── pedidos.js
└── docs/
    └── schema.sql           # Script de criação do banco
```

## Como rodar localmente

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/retail-manager.git
cd retail-manager
```

### 2. Configure o Supabase

- Crie um projeto em [supabase.com](https://supabase.com)
- Execute `docs/schema.sql` no SQL Editor do Supabase
- Copie a `SUPABASE_URL` e `SUPABASE_KEY` do painel

### 3. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Crie o arquivo .env
echo "SUPABASE_URL=https://xxxx.supabase.co" >> .env
echo "SUPABASE_KEY=sua_anon_key" >> .env

uvicorn app.main:app --reload
```

API disponível em `http://localhost:8000` · Docs em `http://localhost:8000/docs`

### 4. Frontend

Basta abrir `frontend/index.html` no navegador, ou usar Live Server no VS Code.

## Deploy

### Backend → Railway

1. Conecte o repositório no [Railway](https://railway.app)
2. Defina as variáveis de ambiente `SUPABASE_URL` e `SUPABASE_KEY`
3. O Railway detecta FastAPI automaticamente via `Procfile`

### Frontend → GitHub Pages

1. Vá em Settings → Pages → Source: `main` branch `/frontend`
2. Atualize `frontend/js/api.js` com a URL do Railway em produção

## Adaptando para outros segmentos

O sistema foi desenhado para ser genérico. Para adaptar:

- **Restaurante:** renomeie "Produto" → "Item de cardápio", "Loja" → "Unidade"
- **Serviços:** substitua "Estoque" por "Agenda de disponibilidade"
- **Distribuidora:** expanda o módulo de Pedidos com rotas de entrega

## Licença

MIT — use à vontade.
