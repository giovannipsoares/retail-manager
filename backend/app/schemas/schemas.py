from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ── Categorias ──────────────────────────────────────────────

class CategoriaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None

class CategoriaOut(CategoriaCreate):
    id: int
    criado_em: datetime


# ── Fornecedores ─────────────────────────────────────────────

class FornecedorCreate(BaseModel):
    nome: str
    cnpj: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    prazo_entrega: int = Field(default=7, ge=1)
    ativo: bool = True

class FornecedorUpdate(BaseModel):
    nome: Optional[str] = None
    cnpj: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    prazo_entrega: Optional[int] = None
    ativo: Optional[bool] = None

class FornecedorOut(FornecedorCreate):
    id: int
    criado_em: datetime
    atualizado_em: datetime


# ── Produtos ─────────────────────────────────────────────────

class ProdutoCreate(BaseModel):
    sku: str
    nome: str
    descricao: Optional[str] = None
    categoria_id: Optional[int] = None
    fornecedor_id: Optional[int] = None
    preco_custo: float = Field(ge=0)
    preco_venda: float = Field(ge=0)
    estoque_minimo: int = Field(default=5, ge=0)
    ativo: bool = True

class ProdutoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    categoria_id: Optional[int] = None
    fornecedor_id: Optional[int] = None
    preco_custo: Optional[float] = None
    preco_venda: Optional[float] = None
    estoque_minimo: Optional[int] = None
    ativo: Optional[bool] = None

class ProdutoOut(ProdutoCreate):
    id: int
    criado_em: datetime
    atualizado_em: datetime


# ── Estoque ──────────────────────────────────────────────────

class EstoqueAjuste(BaseModel):
    produto_id: int
    loja_id: int
    quantidade: int
    tipo: str = Field(..., pattern="^(entrada|saida|ajuste)$")
    referencia: Optional[str] = None

class EstoqueOut(BaseModel):
    produto_id: int
    loja_id: int
    quantidade: int


# ── Pedidos ──────────────────────────────────────────────────

class PedidoItemCreate(BaseModel):
    produto_id: int
    quantidade: int = Field(ge=1)
    preco_unit: float = Field(ge=0)

class PedidoCreate(BaseModel):
    tipo: str = Field(..., pattern="^(compra|venda|transferencia)$")
    fornecedor_id: Optional[int] = None
    loja_id: Optional[int] = None
    observacoes: Optional[str] = None
    itens: list[PedidoItemCreate] = []

class PedidoStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(rascunho|confirmado|em_transito|entregue|cancelado)$")

class PedidoOut(BaseModel):
    id: int
    numero: str
    tipo: str
    fornecedor_id: Optional[int]
    loja_id: Optional[int]
    status: str
    total: float
    observacoes: Optional[str]
    criado_em: datetime
    atualizado_em: datetime
