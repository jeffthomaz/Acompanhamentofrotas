"""Monta o bloco "conectividade" do dados-fonte.json a partir do Power BI "Conectividade"
e da planilha manual status_frotas.xlsx. Não leva motorista, telefone nem apelido.

Uso:
    python conectividade_do_powerbi.py <conectividade.json> <status_frotas.xlsx> <dados-fonte.json> [pendencias.json]

<conectividade.json>: resultado desta consulta no PBI "Conectividade" (uma linha por veículo por dia):
    EVALUATE SELECTCOLUMNS(Fbase, "f", Fbase[FROTA], "placa", Fbase[PLACA], "grupo", Fbase[GRUPO DE VEÍCULO],
        "proc", LOOKUPVALUE(Frotas[Processo], Frotas[FROTA], Fbase[FROTA]),
        "resp", LOOKUPVALUE(Frotas[Responsável], Frotas[FROTA], Fbase[FROTA]),
        "d", FORMAT(Fbase[DATAX], "yyyy-mm-dd"), "st", Fbase[_STATUS FIXO], "dias", Fbase[_DIAS OFFLINE.FIXO],
        "ult", FORMAT(Fbase[ÚLTIMA CONEXÃO], "yyyy-mm-dd hh:nn"), "sis", Fbase[STATUS CONEXÃO], "mov", Fbase[STATUS])

<pendencias.json> (opcional): EVALUATE SELECTCOLUMNS(PENDENCIAS_CAMPO, "f", [FROTA], "d", FORMAT([DATA], "yyyy-mm-dd"),
    "equip", [EQUIPAMENTO], "oc", [OCORRÊNCIA ], "classe", [CLASSE], "status", [STATUS ], "obs", [OBSERVAÇÕES])

Regra do status (igual à coluna _STATUS FIXO do relatório): MANUTENÇÃO/PARADO pelo apelido no rastreador,
OFFLINE com 2 dias ou mais sem conexão, senão CONECTADO.
A planilha manual só troca OFFLINE por PARADO ou MANUTENÇÃO, nos dias entre DESDE e ATÉ.
Se o veículo voltar a conectar, continua CONECTADO e o painel avisa que pode sair da planilha.
"""
import json, sys
from datetime import date, datetime

import openpyxl

LETRA = {"CONECTADO": "C", "OFFLINE": "O", "MANUTENÇÃO": "M", "PARADO": "P"}


def linhas(caminho):
    return [{k.strip("[]"): v for k, v in l.items()} for l in json.load(open(caminho, encoding="utf-8"))["data"]["rows"]]


def data(v):
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = str(v or "").strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d/%m/%y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def ler_manual(caminho):
    ws = openpyxl.load_workbook(caminho, data_only=True).worksheets[0]
    out, avisos = {}, []
    for n, r in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not r or r[0] in (None, ""):
            continue
        f = str(r[0]).strip().split(".")[0]
        st = str(r[1] or "").strip().upper().replace("MANUTENCAO", "MANUTENÇÃO")
        if st not in ("PARADO", "MANUTENÇÃO"):
            avisos.append("linha %d (frota %s): STATUS precisa ser PARADO ou MANUTENÇÃO" % (n, f)); continue
        desde = data(r[2]) or date(2000, 1, 1)
        ate = data(r[3]) if len(r) > 3 else None
        obs = str(r[4]).strip() if len(r) > 4 and r[4] else ""
        out.setdefault(f, []).append({"status": st, "desde": desde, "ate": ate, "obs": obs})
    return out, avisos


def main(origem, manual_xlsx, destino, pend=None):
    rows = linhas(origem)
    manual, avisos = ler_manual(manual_xlsx)
    dias = sorted({r["d"] for r in rows if r["d"]})
    di = {d: i for i, d in enumerate(dias)}
    ultimo = dias[-1]
    frotas, hist, atual = {}, {}, {}
    for r in rows:  # uma linha por veículo por dia (duplicadas: fica a última)
        f = str(r["f"] or "").strip()
        if not f or not r["d"]:
            continue
        proc = (r["proc"] or "").strip().upper()
        frotas[f] = {"placa": (r["placa"] or "").strip(), "grupo": (r["grupo"] or "").strip().title(),
                     "processo": proc if proc and proc != "0" else "SEM PROCESSO",
                     "responsavel": (r["resp"] or "").strip().title()}
        st = (r["st"] or "").strip().upper()
        letra = LETRA.get(st, "?")
        man = None
        if letra == "O":
            d = date.fromisoformat(r["d"])
            for m in manual.get(f, []):
                if m["desde"] <= d and (not m["ate"] or d <= m["ate"]):
                    man = m
            if man:
                letra = "m" if man["status"] == "MANUTENÇÃO" else "p"  # minúscula = informado na planilha
        h = hist.setdefault(f, ["."] * len(dias))
        h[di[r["d"]]] = letra
        if r["d"] == ultimo:
            x = {"st": letra, "dias": r["dias"] or 0, "ult": r["ult"] or "", "sis": (r["sis"] or "").strip().upper(),
                 "mov": (r["mov"] or "").strip().title()}
            mm = man or next((m for m in manual.get(f, []) if not m["ate"] or m["ate"] >= date.fromisoformat(ultimo)), None)
            if mm:
                x["manual"] = {"status": mm["status"], "desde": mm["desde"].strftime("%d/%m/%Y") if mm["desde"].year > 2000 else "",
                               "obs": mm["obs"], "aplicado": bool(man)}
            atual[f] = x
    sem_dado = [f for f in manual if f not in frotas]
    if sem_dado:
        avisos.append("frotas da planilha que não estão no rastreamento: " + ", ".join(sorted(sem_dado)))
    pendencias = []
    if pend:
        for p in linhas(pend):
            pendencias.append({"f": str(p["f"]).strip(), "d": p["d"], "equip": (p["equip"] or "").title(),
                               "oc": p["oc"] or "", "classe": p["classe"] or "", "status": (p["status"] or "").strip().title(),
                               "obs": p["obs"] or ""})
    D = json.load(open(destino, encoding="utf-8"))
    ini, fim = date.fromisoformat(dias[0]), date.fromisoformat(ultimo)
    D["conectividade"] = {
        "real": True, "fonte": "Power BI Conectividade + planilha status_frotas.xlsx",
        "periodo": "%s a %s" % (ini.strftime("%d/%m/%Y"), fim.strftime("%d/%m/%Y")),
        "dias": dias, "frotas": frotas, "hist": {f: "".join(h) for f, h in hist.items()},
        "atual": atual, "pendencias": pendencias,
    }
    json.dump(D, open(destino, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    from collections import Counter
    print("%d veículos, %d dias, último %s:" % (len(frotas), len(dias), ultimo), dict(Counter(x["st"] for x in atual.values())))
    print("planilha manual: %d frotas" % len(manual))
    for a in avisos:
        print("AVISO:", a)


if __name__ == "__main__":
    if len(sys.argv) not in (4, 5):
        sys.exit(__doc__)
    main(*sys.argv[1:])
