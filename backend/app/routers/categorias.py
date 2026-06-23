from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.schemas.schemas import CategoriaCreate

router = APIRouter()


@router.get("/")
def listar_categorias():
    return supabase.table("categorias").select("*").order("nome").execute().data


@router.post("/", status_code=201)
def criar_categoria(cat: CategoriaCreate):
    result = supabase.table("categorias").insert(cat.model_dump()).execute()
    return result.data[0]


@router.delete("/{cat_id}", status_code=204)
def excluir_categoria(cat_id: int):
    result = supabase.table("categorias").delete().eq("id", cat_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
