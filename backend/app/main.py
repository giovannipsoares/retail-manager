from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import produtos, fornecedores, pedidos, estoque, categorias

app = FastAPI(
    title="RetailManager API",
    description="API de gestão de varejo — produtos, estoque, fornecedores e pedidos.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, substitua pelo domínio do frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categorias.router, prefix="/categorias", tags=["Categorias"])
app.include_router(produtos.router,    prefix="/produtos",    tags=["Produtos"])
app.include_router(estoque.router,     prefix="/estoque",     tags=["Estoque"])
app.include_router(fornecedores.router,prefix="/fornecedores",tags=["Fornecedores"])
app.include_router(pedidos.router,     prefix="/pedidos",     tags=["Pedidos"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": "RetailManager API v1.0"}
