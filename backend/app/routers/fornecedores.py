from fastapi import APIRouter, HTTPException, Query
from app.database import supabase
from app.schemas.schemas import FornecedorCreate, FornecedorUpdate
from typing import Optional

router = APIRouter()


@router.get("/")
def listar_fornecedores(
    ativo: Optional[bool] = None,
    busca: Optional[str] = Query(default=None),
):
    q = supabase.table("fornecedores").select("*")
    if ativo is not None:
        q = q.eq("ativo", ativo)
    if busca:
        q = q.ilike("nome", f"%{busca}%")
    return q.order("nome").execute().data


@router.get("/{fornecedor_id}")
def buscar_fornecedor(fornecedor_id: int):
    result = supabase.table("fornecedores").select("*").eq("id", fornecedor_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return result.data


@router.post("/", status_code=201)
def criar_fornecedor(fornecedor: FornecedorCreate):
    if fornecedor.cnpj:
        existe = supabase.table("fornecedores").select("id").eq("cnpj", fornecedor.cnpj).execute()
        if existe.data:
            raise HTTPException(status_code=409, detail="CNPJ já cadastrado")
    result = supabase.table("fornecedores").insert(fornecedor.model_dump()).execute()
    return result.data[0]


@router.patch("/{fornecedor_id}")
def atualizar_fornecedor(fornecedor_id: int, dados: FornecedorUpdate):
    payload = {k: v for k, v in dados.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo fornecido")
    result = supabase.table("fornecedores").update(payload).eq("id", fornecedor_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return result.data[0]


@router.delete("/{fornecedor_id}", status_code=204)
def desativar_fornecedor(fornecedor_id: int):
    result = supabase.table("fornecedores").update({"ativo": False}).eq("id", fornecedor_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
