from fastapi import APIRouter, HTTPException, Query
from app.database import supabase
from app.schemas.schemas import PedidoCreate, PedidoStatusUpdate
from typing import Optional
import datetime

router = APIRouter()


def _gerar_numero_pedido() -> str:
    ts = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    return f"PED-{ts}"


@router.get("/")
def listar_pedidos(
    status: Optional[str] = None,
    tipo: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
):
    q = supabase.table("pedidos").select(
        "*, fornecedores(nome), lojas(nome)"
    ).order("criado_em", desc=True)
    if status:
        q = q.eq("status", status)
    if tipo:
        q = q.eq("tipo", tipo)
    return q.range(offset, offset + limit - 1).execute().data


@router.get("/{pedido_id}")
def buscar_pedido(pedido_id: int):
    pedido = (
        supabase.table("pedidos")
        .select("*, fornecedores(nome), lojas(nome)")
        .eq("id", pedido_id)
        .single()
        .execute()
    )
    if not pedido.data:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    itens = (
        supabase.table("pedido_itens")
        .select("*, produtos(sku, nome)")
        .eq("pedido_id", pedido_id)
        .execute()
    )
    return {**pedido.data, "itens": itens.data}


@router.post("/", status_code=201)
def criar_pedido(pedido: PedidoCreate):
    numero = _gerar_numero_pedido()
    payload = pedido.model_dump(exclude={"itens"})
    payload["numero"] = numero

    result = supabase.table("pedidos").insert(payload).execute()
    pedido_id = result.data[0]["id"]

    if pedido.itens:
        itens_payload = [
            {"pedido_id": pedido_id, **item.model_dump()} for item in pedido.itens
        ]
        supabase.table("pedido_itens").insert(itens_payload).execute()

    return supabase.table("pedidos").select("*").eq("id", pedido_id).single().execute().data


@router.patch("/{pedido_id}/status")
def atualizar_status(pedido_id: int, body: PedidoStatusUpdate):
    result = (
        supabase.table("pedidos")
        .update({"status": body.status})
        .eq("id", pedido_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return result.data[0]


@router.delete("/{pedido_id}", status_code=204)
def cancelar_pedido(pedido_id: int):
    pedido = supabase.table("pedidos").select("status").eq("id", pedido_id).single().execute()
    if not pedido.data:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if pedido.data["status"] == "entregue":
        raise HTTPException(status_code=400, detail="Não é possível cancelar um pedido já entregue")
    supabase.table("pedidos").update({"status": "cancelado"}).eq("id", pedido_id).execute()
