from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from app.database import supabase
from typing import Optional
import csv
import io

router = APIRouter()


def _parse_mes(valor: str) -> tuple[int, int]:
    """Converte '2025.07' ou '2025,07' em (2025, 7)."""
    valor = str(valor).strip().replace(",", ".")
    partes = valor.split(".")
    if len(partes) == 2:
        return int(partes[0]), int(partes[1])
    raise ValueError(f"Formato de mês inválido: {valor}")


def _extrair_codigo(valor: str) -> str:
    """Extrai código de '141-SACOLAO IGAPO' → '141'."""
    return str(valor).split("-")[0].strip()


def _extrair_nome(valor: str) -> str:
    """Extrai nome de '141-SACOLAO IGAPO' → 'SACOLAO IGAPO'."""
    partes = str(valor).split("-", 1)
    return partes[1].strip() if len(partes) > 1 else valor.strip()


# ── Importação ──────────────────────────────────────────────

@router.post("/importar")
async def importar_csv(arquivo: UploadFile = File(...)):
    """
    Importa CSV de vendas no formato Onixx.
    Colunas esperadas: CODIGO, DESCRICAO, MÊS, LOJA, GRUPO,
    FORNECEDOR, MARCA, VENDEDOR, QUANTIDADE, TOTAL VENDA,
    PROMOÇÃO INÍCIO, PROMOÇÃO FIM, PREÇO, CUSTO, MARKUP
    """
    conteudo = await arquivo.read()

    # Tenta decodificar com UTF-8 e fallback para latin-1
    try:
        texto = conteudo.decode("utf-8-sig")
    except UnicodeDecodeError:
        texto = conteudo.decode("latin-1")

    reader = csv.DictReader(io.StringIO(texto), delimiter=";")

    # Normaliza nomes das colunas (remove espaços e acentos problemáticos)
    registros = []
    erros = []
    inseridos = 0

    for i, row in enumerate(reader, start=2):
        # Pula linhas de cabeçalho/rodapé que não sejam dados reais
        codigo = str(row.get("CODIGO", "")).strip()
        if not codigo or not codigo.isdigit():
            continue

        try:
            ano, mes = _parse_mes(row.get("MÊS", row.get("MES", "")))
            quantidade = float(str(row.get("QUANTIDADE", 0)).replace(",", ".") or 0)
            total_venda = float(str(row.get("TOTAL VENDA", 0)).replace(",", ".") or 0)
            preco = float(str(row.get("PREÇO", row.get("PRECO", 0))).replace(",", ".") or 0)
            custo = float(str(row.get("CUSTO", 0)).replace(",", ".") or 0)
            markup = float(str(row.get("MARKUP", 0)).replace(",", ".") or 0)

            loja_raw = row.get("LOJA", "")
            registros.append({
                "codigo_produto": codigo,
                "descricao": str(row.get("DESCRICAO", "")).strip(),
                "ano": ano,
                "mes": mes,
                "codigo_loja": _extrair_codigo(loja_raw),
                "nome_loja": _extrair_nome(loja_raw),
                "grupo": str(row.get("GRUPO", "")).strip(),
                "fornecedor": str(row.get("FORNECEDOR", "")).strip(),
                "marca": str(row.get("MARCA", "")).strip(),
                "quantidade": quantidade,
                "total_venda": total_venda,
                "preco": preco,
                "custo": custo,
                "markup": markup,
                "margem": total_venda - (custo * quantidade),
            })
        except Exception as e:
            erros.append(f"Linha {i}: {str(e)}")

    if not registros:
        raise HTTPException(status_code=400, detail="Nenhum registro válido encontrado no arquivo.")

    # Insere em lotes de 500
    for i in range(0, len(registros), 500):
        lote = registros[i:i+500]
        supabase.table("vendas_historico").insert(lote).execute()
        inseridos += len(lote)

    return {
        "inseridos": inseridos,
        "erros": len(erros),
        "detalhes_erros": erros[:10],
    }


@router.delete("/importar")
def limpar_historico():
    """Apaga todo o histórico de vendas importado."""
    supabase.table("vendas_historico").delete().neq("id", 0).execute()
    return {"mensagem": "Histórico limpo com sucesso"}


# ── Filtros disponíveis ─────────────────────────────────────

@router.get("/filtros")
def listar_filtros():
    """Retorna lojas, grupos e período disponíveis no histórico."""
    lojas = supabase.table("vendas_historico").select("codigo_loja, nome_loja").execute()
    grupos = supabase.table("vendas_historico").select("grupo").execute()
    periodos = supabase.table("vendas_historico").select("ano, mes").execute()

    lojas_unicas = {r["codigo_loja"]: r["nome_loja"] for r in lojas.data}
    grupos_unicos = sorted(set(r["grupo"] for r in grupos.data if r["grupo"]))
    periodos_unicos = sorted(
        set((r["ano"], r["mes"]) for r in periodos.data),
        reverse=True
    )

    return {
        "lojas": [{"codigo": k, "nome": v} for k, v in sorted(lojas_unicas.items())],
        "grupos": grupos_unicos,
        "periodos": [{"ano": a, "mes": m, "label": f"{m:02d}/{a}"} for a, m in periodos_unicos],
    }


# ── Curva ABC ───────────────────────────────────────────────

@router.get("/curva-abc")
def curva_abc(
    base: str = Query(default="faturamento", description="faturamento | quantidade | margem"),
    loja: Optional[str] = None,
    grupo: Optional[str] = None,
    ano_ini: Optional[int] = None,
    mes_ini: Optional[int] = None,
    ano_fim: Optional[int] = None,
    mes_fim: Optional[int] = None,
):
    q = supabase.table("vendas_historico").select(
        "codigo_produto, descricao, quantidade, total_venda, margem, grupo, fornecedor"
    )
    if loja:
        q = q.eq("codigo_loja", loja)
    if grupo:
        q = q.eq("grupo", grupo)
    if ano_ini and mes_ini:
        q = q.gte("ano", ano_ini).gte("mes", mes_ini)
    if ano_fim and mes_fim:
        q = q.lte("ano", ano_fim).lte("mes", mes_fim)

    dados = q.execute().data

    # Agrega por produto
    produtos = {}
    for r in dados:
        cod = r["codigo_produto"]
        if cod not in produtos:
            produtos[cod] = {
                "codigo": cod,
                "descricao": r["descricao"],
                "grupo": r["grupo"],
                "fornecedor": r["fornecedor"],
                "quantidade": 0,
                "faturamento": 0,
                "margem": 0,
            }
        produtos[cod]["quantidade"] += r["quantidade"]
        produtos[cod]["faturamento"] += r["total_venda"]
        produtos[cod]["margem"] += r["margem"]

    lista = list(produtos.values())

    # Ordena pela base escolhida
    campo = {"faturamento": "faturamento", "quantidade": "quantidade", "margem": "margem"}.get(base, "faturamento")
    lista.sort(key=lambda x: x[campo], reverse=True)

    total = sum(p[campo] for p in lista)
    if total == 0:
        return []

    acumulado = 0
    for p in lista:
        acumulado += p[campo]
        pct = (acumulado / total) * 100
        p["pct_acumulado"] = round(pct, 2)
        p["valor_base"] = round(p[campo], 2)
        p["classe"] = "A" if pct <= 80 else ("B" if pct <= 95 else "C")

    return lista


# ── Giro de estoque ─────────────────────────────────────────

@router.get("/giro")
def giro_estoque(
    loja: Optional[str] = None,
    meses: int = Query(default=3, ge=1, le=24),
):
    """
    Calcula dias de cobertura e número de giros.
    Cruza vendas_historico com a tabela de estoque atual.
    """
    q = supabase.table("vendas_historico").select(
        "codigo_produto, descricao, quantidade, ano, mes"
    )
    if loja:
        q = q.eq("codigo_loja", loja)

    dados = q.execute().data

    # Agrupa por produto
    from collections import defaultdict
    vendas = defaultdict(lambda: {"descricao": "", "meses_com_venda": set(), "total_qtd": 0})
    for r in dados:
        cod = r["codigo_produto"]
        vendas[cod]["descricao"] = r["descricao"]
        vendas[cod]["meses_com_venda"].add((r["ano"], r["mes"]))
        vendas[cod]["total_qtd"] += r["quantidade"]

    # Busca estoque atual
    est_q = supabase.table("estoque").select("produto_id, quantidade, produtos(sku, nome)")
    if loja:
        est_q = est_q.eq("loja_id", loja)
    estoque = est_q.execute().data

    estoque_por_sku = {}
    for e in estoque:
        sku = e["produtos"]["sku"] if e.get("produtos") else None
        if sku:
            estoque_por_sku[sku] = e["quantidade"]

    resultado = []
    dias_periodo = meses * 30

    for cod, info in vendas.items():
        qtd_total = info["total_qtd"]
        venda_media_diaria = qtd_total / dias_periodo if dias_periodo > 0 else 0
        estoque_atual = estoque_por_sku.get(cod, 0)

        dias_cobertura = round(estoque_atual / venda_media_diaria, 1) if venda_media_diaria > 0 else 999
        num_giros = round(qtd_total / estoque_atual, 2) if estoque_atual > 0 else 0

        status = "ok" if dias_cobertura >= 30 else ("baixo" if dias_cobertura >= 10 else "critico")

        resultado.append({
            "codigo": cod,
            "descricao": info["descricao"],
            "estoque_atual": estoque_atual,
            "venda_media_diaria": round(venda_media_diaria, 2),
            "dias_cobertura": dias_cobertura,
            "num_giros": num_giros,
            "status": status,
        })

    resultado.sort(key=lambda x: x["dias_cobertura"])
    return resultado


# ── Ruptura ─────────────────────────────────────────────────

@router.get("/ruptura")
def ruptura(loja: Optional[str] = None):
    """Produtos zerados ou abaixo do mínimo com estimativa de dias até zerar."""
    result = supabase.table("vw_estoque_consolidado").select("*").in_(
        "status_estoque", ["critico", "zerado"]
    ).execute()
    return result.data


# ── Sugestão de compra ──────────────────────────────────────

@router.get("/sugestao-compra")
def sugestao_compra(
    loja: Optional[str] = None,
    meses: int = Query(default=3, ge=1, le=12),
    cobertura_alvo: int = Query(default=45, ge=7, le=180),
):
    """
    Calcula sugestão de compra:
    Qtd sugerida = (venda_media_diaria × (prazo_entrega + cobertura_alvo)) - estoque_atual
    """
    # Busca vendas
    q = supabase.table("vendas_historico").select(
        "codigo_produto, descricao, quantidade, fornecedor"
    )
    if loja:
        q = q.eq("codigo_loja", loja)
    dados = q.execute().data

    from collections import defaultdict
    vendas = defaultdict(lambda: {"descricao": "", "fornecedor": "", "total_qtd": 0})
    for r in dados:
        cod = r["codigo_produto"]
        vendas[cod]["descricao"] = r["descricao"]
        vendas[cod]["fornecedor"] = r["fornecedor"]
        vendas[cod]["total_qtd"] += r["quantidade"]

    # Busca estoque e prazo dos fornecedores
    est_result = supabase.table("estoque").select(
        "produto_id, quantidade, produtos(sku, nome, estoque_minimo, fornecedores(prazo_entrega))"
    ).execute()

    estoque_map = {}
    for e in est_result.data:
        if e.get("produtos"):
            sku = e["produtos"]["sku"]
            prazo = e["produtos"].get("fornecedores", {}) or {}
            estoque_map[sku] = {
                "quantidade": e["quantidade"],
                "estoque_minimo": e["produtos"].get("estoque_minimo", 5),
                "prazo_entrega": prazo.get("prazo_entrega", 7) if prazo else 7,
            }

    dias_periodo = meses * 30
    resultado = []

    for cod, info in vendas.items():
        venda_diaria = info["total_qtd"] / dias_periodo if dias_periodo > 0 else 0
        est = estoque_map.get(cod, {"quantidade": 0, "estoque_minimo": 5, "prazo_entrega": 7})

        qtd_necessaria = venda_diaria * (est["prazo_entrega"] + cobertura_alvo)
        qtd_sugerida = max(0, round(qtd_necessaria - est["quantidade"]))

        if qtd_sugerida > 0:
            resultado.append({
                "codigo": cod,
                "descricao": info["descricao"],
                "fornecedor": info["fornecedor"],
                "estoque_atual": est["quantidade"],
                "venda_media_diaria": round(venda_diaria, 2),
                "prazo_entrega": est["prazo_entrega"],
                "cobertura_alvo": cobertura_alvo,
                "qtd_sugerida": qtd_sugerida,
                "valor_estimado": round(qtd_sugerida * est.get("preco", 0), 2),
            })

    resultado.sort(key=lambda x: x["qtd_sugerida"], reverse=True)
    return resultado
