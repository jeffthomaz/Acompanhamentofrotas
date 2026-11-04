"""Monta o bloco "comportamento" do dados-fonte.json a partir dos dois Power BI de monitoramento
comportamental 2026 (frotas leves e pesadas). Não leva motorista, CPF nem documento.

Uso:
    python comportamento_do_powerbi.py <leves.json> <pesadas.json> <base-processos.xlsx> <dados-fonte.json>

<leves.json>: resultado desta consulta no PBI "Dados Monitoramento Comportamental Frotas Leves 2026":
    EVALUATE SELECTCOLUMNS('OCORRÊNCIAS FROTA LEVA PO.GE.03', "f", [PREFIXO], "placa", [PLACA],
        "grupo", [GRUPO], "tipo", [TIPO], "lim", [LIMIAR], "exc", [EXCESSO], "dur", [DURACAO],
        "d", FORMAT([DATA], "yyyy-mm-dd"), "h", [HORA2], "turno", [TURNO ], "proc", [Processo],
        "ger", [GERENCIA ], "nivel", [NIVEL], "lat", [LATITUDE], "lon", [LONGITUDE])

<pesadas.json>: no PBI "Dados Monitoramento Comportamental Frotas Pesadas 2026":
    EVALUATE SELECTCOLUMNS('Frota Pesada POLGE03', "f", [PREFIXO], "placa", [PLACA], "grupo", [GRUPO],
        "tipo", [TIPO], "lim", [LIMIAR], "exc", [EXCESSO], "dur", [DURACAO],
        "d", FORMAT([DATA], "yyyy-mm-dd"), "h", [HORA2], "turno", [TURNO ], "ger", [GERÊNCIA],
        "nivel", [NIVEL], "rot", [RÓTULO], "desc", [ALERTA DESCONSIDERADO],
        "lat", [LATITUDE], "lon", [LONGITUDE])

<base-processos.xlsx>: "Ocorrências monitoramento 2026.B.xlsx"; a 3ª aba (BASE DE INFORMAÇÃO) dá o
processo de cada frota pesada (a tabela da frota pesada não tem processo).

Excesso de velocidade nas faixas da nova política de frotas, pelo % acima do limite da via
(EXCESSO / LIMIAR): até 20%, de 20% até 50%, acima de 50%. A política antiga (7% / 27% / 57%) não é usada.
"""
import json, re, sys
from collections import Counter, defaultdict
from datetime import date

import openpyxl

TIPOS = [
    {"id": "vel1", "nome": "Até 20%", "grupo": "vel"},
    {"id": "vel2", "nome": "De 20% até 50%", "grupo": "vel"},
    {"id": "vel3", "nome": "Acima de 50%", "grupo": "vel"},
    {"id": "celular", "nome": "Uso de celular"},
    {"id": "cinto", "nome": "Sem cinto de segurança"},
    {"id": "distracao", "nome": "Distração"},
    {"id": "fadiga", "nome": "Fadiga e bocejo"},
    {"id": "camera", "nome": "Câmera obstruída ou desconectada"},
    {"id": "outros", "nome": "Freada, curva ou aceleração brusca"},
]
POR_TIPO = {
    "MANUSEIO_CELULAR": "celular", "SEM_CINTO": "cinto", "DISTRACAO_MOTORISTA": "distracao",
    "BOCEJO": "fadiga", "FADIGA_MOTORISTA": "fadiga",
    "CAMERA_OBSTRUIDA": "camera", "DESCONEXAO_DA_CAMERA_DO_MOTORISTA": "camera",
    "DESCONEXAO_DA_CAMERA_DA_PISTA": "camera", "DESCONEXAO_DA_CAMERA_DE_AUDITORIA": "camera",
    "FREADA_BRUSCA": "outros", "CURVA_BRUSCA": "outros", "ACELERACAO_BRUSCA": "outros",
}


def kmh(s):
    m = re.search(r"\d+(?:[.,]\d+)?", s or "")
    return float(m.group().replace(",", ".")) if m else None


def tipo_id(r):
    t = (r["tipo"] or "").strip().upper().replace(" ", "_")
    if t == "EXCESSO_VELOCIDADE":
        lim, exc = kmh(r["lim"]), kmh(r["exc"])
        p = (exc / lim - 1) * 100 if lim and exc else 0
        return "vel1" if p <= 20 else "vel2" if p <= 50 else "vel3"
    return POR_TIPO.get(t)


def nome_proc(s):
    s = re.sub(r"\s+", " ", (s or "").strip()).upper()
    return s or "SEM PROCESSO"


def linhas(caminho):
    return [{k.strip("[]"): v for k, v in l.items()} for l in json.load(open(caminho, encoding="utf-8"))["data"]["rows"]]


def main(leves, pesadas, base_xlsx, destino):
    wb = openpyxl.load_workbook(base_xlsx, read_only=True, data_only=True)
    base = {str(x[0]).strip(): nome_proc(x[3]) for x in wb.worksheets[2].iter_rows(min_row=2, values_only=True) if x[0]}

    frotas, proc_v, ger_v = {}, defaultdict(Counter), defaultdict(Counter)
    cont, ignorados = Counter(), Counter()
    dias = set()
    for origem, rows in (("Leve", linhas(leves)), ("Pesada", linhas(pesadas))):
        for r in rows:
            if (r.get("rot") or "ALARME VERDADEIRO").strip() != "ALARME VERDADEIRO" or (r.get("desc") or "NÃO").strip() == "SIM":
                ignorados["alarme falso/desconsiderado"] += 1; continue
            t = tipo_id(r)
            if not t:
                ignorados[r["tipo"]] += 1; continue
            f = str(r["f"]).strip()
            frotas.setdefault(f, {"placa": (r["placa"] or "").strip(), "frota": origem, "grupo": (r["grupo"] or "").strip().title()})
            proc_v[f][nome_proc(r.get("proc")) if origem == "Leve" else base.get(f, "SEM PROCESSO")] += 1
            ger_v[f][(r.get("ger") or "").strip().title() or "Sem gerência"] += 1
            cont[(r["d"], t, f)] += 1
            dias.add(r["d"])
    for f, x in frotas.items():
        x["processo"] = proc_v[f].most_common(1)[0][0]
        x["gerencia"] = ger_v[f].most_common(1)[0][0]

    dias = sorted(dias)
    ini = date.fromisoformat(dias[0])
    tid = {t["id"]: i for i, t in enumerate(TIPOS)}
    # [dia (0 = primeiro dia), tipo, frota, quantidade]
    ev = sorted([[(date.fromisoformat(d) - ini).days, tid[t], f, n] for (d, t, f), n in cont.items()])
    fim = date.fromisoformat(dias[-1])
    D = json.load(open(destino, encoding="utf-8"))
    D["comportamento"] = {
        "real": True,
        "fonte": "Power BI Monitoramento Comportamental Frotas Leves e Pesadas 2026",
        "inicio": dias[0], "fim": dias[-1], "ndias": (fim - ini).days + 1,
        "periodo": "%s a %s" % (ini.strftime("%d/%m/%Y"), fim.strftime("%d/%m/%Y")),
        "tipos": TIPOS, "frotas": frotas, "ev": ev,
    }
    json.dump(D, open(destino, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    tot = sum(cont.values())
    print("%d ocorrências, %d frotas, %d linhas, %s" % (tot, len(frotas), len(ev), D["comportamento"]["periodo"]))
    print("por tipo:", {t["id"]: sum(n for (d, tt, f), n in cont.items() if tt == t["id"]) for t in TIPOS})
    print("fora:", dict(ignorados))


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
