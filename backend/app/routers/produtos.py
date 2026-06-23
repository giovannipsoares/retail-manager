from fastapi import APIRouter, HTTPException, Query
from app.database import supabase
from app.schemas.schemas import ProdutoCreate, ProdutoUpdate, ProdutoOut
from typing import Optional

router = APIRouter()


@router.get("/")
def listar_produtos(
    ativo: Optional[bool] = None,
    categoria_id: Optional[int] = None,
    busca: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
):
    q = supabase.table("produtos").select("*, categorias(nome), fornecedores(nome)")
    if ativo is not None:
        q = q.eq("ativo", ativo)
    if categoria_id:
        q = q.eq("categoria_id", categoria_id)
    if busca:
        q = q.ilike("nome", f"%{busca}%")
    result = q.range(offset, offset + limit - 1).execute()
    return result.data


@router.get("/{produto_id}")
def buscar_produto(produto_id: int):
    result = (
        supabase.table("produtos")
        .select("*, categorias(nome), fornecedores(nome)")
        .eq("id", produto_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return result.data


@router.post("/", status_code=201)
def criar_produto(produto: ProdutoCreate):
    # Verifica SKU duplicado
    existe = supabase.table("produtos").select("id").eq("sku", produto.sku).execute()
    if existe.data:
        raise HTTPException(status_code=409, detail="SKU já cadastrado")
    result = supabase.table("produtos").insert(produto.model_dump()).execute()
    return result.data[0]


@router.patch("/{produto_id}")
def atualizar_produto(produto_id: int, dados: ProdutoUpdate):
    payload = {k: v for k, v in dados.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo fornecido para atualizar")
    result = supabase.table("produtos").update(payload).eq("id", produto_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return result.data[0]


@router.delete("/{produto_id}", status_code=204)
def desativar_produto(produto_id: int):
    """Soft delete — marca como inativo em vez de excluir."""
    result = supabase.table("produtos").update({"ativo": False}).eq("id", produto_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
