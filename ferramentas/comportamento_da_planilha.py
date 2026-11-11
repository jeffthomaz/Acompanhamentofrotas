"""Monta o bloco "comportamento" do dados-fonte.json a partir da planilha
"Ocorrências monitoramento comportamental Nova..xlsx" (fonte do Comportamental desde 10/11/2026,
no lugar dos dois Power BI). Não leva motorista, CPF nem comentários.

Uso:
    python comportamento_da_planilha.py "<Ocorrências monitoramento comportamental Nova..xlsx>" <dados-fonte.json>

Abas usadas: "Frota Leve" e "Frota Pesada" (cabeçalho na linha 2) e "BASE DE INFORMAÇÃO" (processo de
cada frota pesada). Mesmas regras de comportamento_do_powerbi.py: faixas de excesso de velocidade da
nova política, só ALARME VERDADEIRO e não desconsiderado, sem freada/curva/aceleração brusca.
Ocorrência com ULTIMO_COMENTARIO "ALARME VERDADEIRO.( PRESTADORES DE SERVIÇO )" é desconsiderada,
de qualquer tipo (pedido do usuário em 10/11/2026). Tipos que chegaram errados são trocados pela lista
ferramentas/ocorrencias_corrigidas.json (frota, data, hora, de, para).
A planilha tem o ano todo, então ela substitui o que estava salvo do primeiro dia dela em diante.
Ultrapassagem em faixa contínua não tem tipo próprio: vale o ULTIMO_COMENTARIO
"ALARME VERDADEIRO - ULTRAPASSAGEM EM FAIXA CONTÍNUA", seja qual for o TIPO da linha (pedido do usuário
em 10/11/2026). A ocorrência passa a contar só como ultrapassagem, não pelo tipo original.
Linhas repetidas (mesma frota, data, hora e tipo) contam uma vez só (pedido do usuário em 11/11/2026).
Cada ocorrência leva o turno pela HORA (A 07:00–15:10, B 15:10–23:10, C 23:10–07:00), usado no
balanço por turno da aba Resumo, e a hora cheia (0–23), usada nos picos por hora (pedido do usuário em 10/11/2026).
"""
import json, os, sys
from datetime import date, datetime, time

import openpyxl

from comportamento_do_powerbi import montar, nome_proc
from permanencia_do_powerbi import classifica, excluida


def coord(v):
    """LATITUDE/LONGITUDE da planilha vêm sem o ponto decimal (ex.: -18564455 = -18,564455)."""
    if v is None or v == "" or str(v).strip() in ("-", "0"):
        return None
    try:
        x = float(str(v).replace(",", "."))
    except ValueError:
        return None
    if abs(x) <= 180:
        return x
    s = str(abs(int(x)))
    return (-1 if x < 0 else 1) * float(s[:2] + "." + s[2:])


def local(r, col):
    """Nome do local para o mapa de calor: a cerca (se não for de pessoa), senão a via e a cidade."""
    cerca = txt(col(r, "CERCA ELETRÔNICA")).strip(" -")
    if cerca and not excluida(cerca):
        nome, tipo = classifica(cerca)
        if tipo != "colaborador":
            return nome
    via, cid = txt(col(r, "LOGRADOURO")).strip(" -"), txt(col(r, "CIDADE")).strip(" -")
    via = via.split(";")[0].strip()
    return " · ".join(x for x in (via, cid) if x) or "Sem local"


def txt(v):
    return "" if v is None else str(v).strip()


def correcoes():
    caminho = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ocorrencias_corrigidas.json")
    if not os.path.exists(caminho):
        return {}
    return {(c["frota"], c["data"], c["hora"], c["de"]): c["para"] for c in json.load(open(caminho, encoding="utf-8"))["ocorrencias"]}


def hora(v):
    return v.strftime("%H:%M:%S") if isinstance(v, (time, datetime)) else txt(v)


def turno(h):
    """Turno pelo horário da ocorrência: A 07:00–15:10, B 15:10–23:10, C 23:10–07:00 (None sem hora)."""
    try:
        hh, mm = int(h[:2]), int(h[3:5])
    except (ValueError, TypeError):
        return None
    m = hh * 60 + mm
    return 0 if 420 <= m < 910 else 1 if 910 <= m < 1390 else 2


def aba(wb, nome, leve, corr=None):
    corr = corr or {}
    ws = wb[nome]
    it = ws.iter_rows(min_row=2, values_only=True)
    H = [txt(h).upper() for h in next(it)]
    ix = {h: i for i, h in enumerate(H)}
    def col(r, *nomes):
        for n in nomes:
            if n in ix and ix[n] < len(r):
                return r[ix[n]]
        return None
    out, prest = [], 0
    for r in it:
        f = txt(col(r, "PREFIXO"))
        d = col(r, "DATA")
        if not f or not isinstance(d, (date, datetime)):
            continue
        if "PRESTADORES DE SERVI" in txt(col(r, "ULTIMO_COMENTARIO")).upper():
            prest += 1
            continue
        tipo = txt(col(r, "TIPO"))
        if "ULTRAPASSAGEM EM FAIXA CONT" in txt(col(r, "ULTIMO_COMENTARIO")).upper():
            tipo = "ULTRAPASSAGEM_FAIXA_CONTINUA"
        k = (f, d.strftime("%Y-%m-%d"), hora(col(r, "HORA")), tipo)
        if k in corr:
            print("%s: %s %s %s corrigida de %s para %s" % (nome, f, d.strftime("%d/%m"), k[2], tipo, corr[k]))
            tipo = corr[k]
        out.append({
            "f": f, "placa": txt(col(r, "PLACA")), "grupo": txt(col(r, "GRUPO")), "tipo": tipo,
            "lim": txt(col(r, "LIMIAR")), "exc": txt(col(r, "EXCESSO")), "d": d.strftime("%Y-%m-%d"), "hs": k[2], "turno": turno(k[2]), "hora": int(k[2][:2]) if turno(k[2]) is not None else None,
            "proc": txt(col(r, "PROCESSO")) if leve else None, "ger": txt(col(r, "GERENCIA", "GERÊNCIA")),
            "rot": txt(col(r, "RÓTULO")) or None, "desc": txt(col(r, "ALERTA DESCONSIDERADO")) or None,
            "lat": coord(col(r, "LATITUDE")), "lon": coord(col(r, "LONGITUDE")), "loc": local(r, col),
        })
    print("%s: %d ocorrência(s) de prestadores de serviço desconsiderada(s)" % (nome, prest))
    return out


def main(planilha, destino):
    wb = openpyxl.load_workbook(planilha, read_only=True, data_only=True)
    base_ws = next(ws for ws in wb.worksheets if ws.title.strip().upper().startswith("BASE DE INFORMA"))
    base = {txt(x[0]): nome_proc(x[3]) for x in base_ws.iter_rows(min_row=2, values_only=True) if x[0]}
    corr = correcoes()
    leves, pesadas = aba(wb, "Frota Leve", True, corr), aba(wb, "Frota Pesada", False, corr)
    # Linha repetida (mesma frota, data, hora e tipo) conta uma vez só (pedido do usuário em 11/11/2026)
    vistos, rep = set(), []
    def unico(r):
        k = (r["f"], r["d"], r["hs"], r["tipo"])
        if k in vistos:
            rep.append(k); return False
        vistos.add(k); return True
    leves, pesadas = [r for r in leves if unico(r)], [r for r in pesadas if unico(r)]
    print("%d linha(s) repetida(s) tirada(s)" % len(rep))
    print("planilha: %d linhas de frota leve, %d de frota pesada" % (len(leves), len(pesadas)))
    montar(leves, pesadas, base, destino, manter_faixa=False)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
