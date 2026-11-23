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
    processar(openpyxl.load_workbook(planilha, read_only=True, data_only=True), destino)


TRAT_TIPOS = {"celular": "MANUSEIO_CELULAR", "cinto": "SEM_CINTO", "distracao": "DISTRACAO_MOTORISTA",
              "faixa": "ULTRAPASSAGEM_FAIXA_CONTINUA", "cigarro": "USO_CIGARRO"}


def com_tratativas(leves, pesadas, T):
    """A partir do 1º dia das tratativas, celular, sem cinto, distração, faixa e cigarro vêm só delas (evita duplicidade;
    pedido do usuário em 23/11/2026). Excesso de velocidade, fadiga e bocejo continuam das ocorrências.
    Coordenadas, placa, grupo e gerência vêm da ocorrência equivalente (mesma frota, dia e tipo, hora mais próxima)."""
    from comportamento_do_powerbi import tipo_id
    trat = T["linhas"]
    ini = T.get("ini") or min(t["d"] for t in trat)  # início da planilha de tratativas (qualquer tipo)
    tt = set(TRAT_TIPOS)
    idx = {}
    for r in leves + pesadas:
        t = tipo_id(r)
        if t in tt:
            idx.setdefault((str(r["f"]), r["d"], t), []).append(r)
    def mins(h):
        try:
            return int(h[:2]) * 60 + int(h[3:5])
        except (TypeError, ValueError):
            return None
    div = divergencias(leves + pesadas, trat, ini, tipo_id)
    fora = lambda r: r["d"] >= ini and tipo_id(r) in tt
    tiradas = sum(1 for r in leves + pesadas if fora(r))
    leves, pesadas = [r for r in leves if not fora(r)], [r for r in pesadas if not fora(r)]
    usados = set()
    for t in trat:
        cands = [x for x in idx.get((t["f"], t["d"], t["t"]), []) if id(x) not in usados]
        hm = mins(t.get("h") or "")
        par = min(cands, key=lambda x: abs((mins(x["hs"]) or 0) - (hm or 0))) if cands else None
        if par is not None:
            usados.add(id(par))
        hs = (t.get("h") or "")[:8]
        tu = turno(hs) if hs else None
        r = {"f": t["f"], "placa": par["placa"] if par else "", "grupo": par["grupo"] if par else "", "tipo": TRAT_TIPOS[t["t"]],
             "lim": "", "exc": "", "d": t["d"], "hs": hs, "turno": tu, "hora": int(hs[:2]) if tu is not None else None,
             "proc": t.get("proc") or (par["proc"] if par else None), "ger": par["ger"] if par else "", "rot": None, "desc": None,
             "lat": t.get("lat") or (par["lat"] if par else None), "lon": t.get("lon") or (par["lon"] if par else None),
             "loc": par["loc"] if par else None}
        (leves if t["o"] == "Leve" else pesadas).append(r)
    print("tratativas: %d ocorrência(s) de celular/cinto/distração/faixa/cigarro das ocorrências trocadas por %d tratativa(s) (desde %s)"
          % (tiradas, len(trat), ini))
    return leves, pesadas, div


def divergencias(rows, trat, ini, tipo_id):
    """Incoerências entre ocorrências e tratativas (pedido do usuário em 23/11/2026):
    - ocorrência de celular, sem cinto, cigarro ou faixa (último comentário) sem tratativa;
    - tratativa (qualquer dos 5 tipos) sem ocorrência equivalente.
    Casa por frota e tipo, com até 1 dia de diferença (turno C passa da meia-noite).
    Ocorrências tiradas a pedido do usuário (ocorrencias_excluidas.json) não entram."""
    from datetime import date as _d
    aqui = os.path.dirname(os.path.abspath(__file__))
    exc = set()
    ce = os.path.join(aqui, "ocorrencias_excluidas.json")
    if os.path.exists(ce):
        exc = {(str(o["frota"]), o["data"], o["tipo"]) for o in json.load(open(ce, encoding="utf-8")).get("ocorrencias", [])}
    alvo = {"celular", "cinto", "cigarro", "faixa"}
    oc = [(str(r["f"]), r["d"], tipo_id(r), r.get("hs") or "") for r in rows if r["d"] >= ini and tipo_id(r) in TRAT_TIPOS]
    tr = [(t["f"], t["d"], t["t"], (t.get("h") or "")[:8]) for t in trat]
    dd = lambda a, b: abs((_d.fromisoformat(a) - _d.fromisoformat(b)).days)
    livre = list(range(len(tr)))
    sem_trat = []
    for f, d, t, h in sorted(oc, key=lambda x: (x[1], x[3])):
        k = next((i for i in livre if tr[i][0] == f and tr[i][2] == t and dd(tr[i][1], d) <= 1), None)
        if k is not None:
            livre.remove(k)
        elif t in alvo and (f, d, t) not in exc:
            sem_trat.append({"f": f, "d": d, "h": h[:5], "t": t})
    usados_oc = {}
    for f, d, t, h in oc:
        usados_oc.setdefault((f, t), []).append(d)
    sem_oc = [{"f": tr[i][0], "d": tr[i][1], "h": tr[i][3][:5], "t": tr[i][2]} for i in livre
              if not any(dd(x, tr[i][1]) <= 1 for x in usados_oc.get((tr[i][0], tr[i][2]), []))]
    print("divergências: %d ocorrência(s) sem tratativa, %d tratativa(s) sem ocorrência" % (len(sem_trat), len(sem_oc)))
    return {"ini": ini, "ocSemTrat": sem_trat, "tratSemOc": sorted(sem_oc, key=lambda x: (x["d"], x["h"]))}


def processar(wb, destino, trat=None):
    """wb: a planilha aberta (ou montada em memória a partir dos dados limpos que o navegador envia)."""
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
    div = None
    if trat and trat.get("linhas"):
        leves, pesadas, div = com_tratativas(leves, pesadas, trat)
    print("planilha: %d linhas de frota leve, %d de frota pesada" % (len(leves), len(pesadas)))
    montar(leves, pesadas, base, destino, manter_faixa=False)
    if div is not None:
        D = json.load(open(destino, encoding="utf-8"))
        D["comportamento"]["diverg"] = div
        json.dump(D, open(destino, "w", encoding="utf-8"), ensure_ascii=False)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
