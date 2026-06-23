from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.schemas.schemas import EstoqueAjuste

router = APIRouter()


@router.get("/")
def listar_estoque(loja_id: int = None, produto_id: int = None):
    q = supabase.table("estoque").select("*, produtos(sku, nome, estoque_minimo), lojas(nome)")
    if loja_id:
        q = q.eq("loja_id", loja_id)
    if produto_id:
        q = q.eq("produto_id", produto_id)
    return q.execute().data


@router.get("/consolidado")
def estoque_consolidado():
    """Retorna a view com status de estoque (normal/baixo/critico/zerado)."""
    result = supabase.table("vw_estoque_consolidado").select("*").execute()
    return result.data


@router.get("/alertas")
def alertas_estoque():
    """Produtos com estoque crítico ou zerado."""
    result = (
        supabase.table("vw_estoque_consolidado")
        .select("*")
        .in_("status_estoque", ["critico", "zerado"])
        .execute()
    )
    return result.data


@router.post("/ajuste")
def ajustar_estoque(ajuste: EstoqueAjuste):
    # Busca registro atual
    atual = (
        supabase.table("estoque")
        .select("quantidade")
        .eq("produto_id", ajuste.produto_id)
        .eq("loja_id", ajuste.loja_id)
        .execute()
    )

    if ajuste.tipo == "entrada":
        delta = ajuste.quantidade
    elif ajuste.tipo == "saida":
        delta = -ajuste.quantidade
    else:  # ajuste direto
        delta = None

    if atual.data:
        nova_qtd = (
            ajuste.quantidade
            if delta is None
            else max(0, atual.data[0]["quantidade"] + delta)
        )
        supabase.table("estoque").update({"quantidade": nova_qtd}).eq(
            "produto_id", ajuste.produto_id
        ).eq("loja_id", ajuste.loja_id).execute()
    else:
        nova_qtd = max(0, ajuste.quantidade if delta is None else delta)
        supabase.table("estoque").insert(
            {"produto_id": ajuste.produto_id, "loja_id": ajuste.loja_id, "quantidade": nova_qtd}
        ).execute()

    # Registra movimentação para auditoria
    supabase.table("movimentacoes_estoque").insert({
        "produto_id": ajuste.produto_id,
        "loja_id": ajuste.loja_id,
        "tipo": ajuste.tipo,
        "quantidade": ajuste.quantidade,
        "referencia": ajuste.referencia,
    }).execute()

    return {"produto_id": ajuste.produto_id, "loja_id": ajuste.loja_id, "quantidade": nova_qtd}
