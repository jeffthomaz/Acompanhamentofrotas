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

Acumulado: a extração substitui só os dias que ela cobre (do primeiro dia dela em diante). Os dias
anteriores já salvos no dados-fonte.json ficam guardados, então a consulta pode trazer só os últimos
dias e o histórico não se perde se o BI mudar.
"""
import json, re, sys
from collections import Counter, defaultdict
from datetime import date, timedelta

import openpyxl

TIPOS = [
    {"id": "vel1", "nome": "Até 20%", "grupo": "vel"},
    {"id": "vel2", "nome": "De 20% até 50%", "grupo": "vel"},
    {"id": "vel3", "nome": "Acima de 50%", "grupo": "vel"},
    {"id": "celular", "nome": "Uso de celular"},
    {"id": "cinto", "nome": "Sem cinto de segurança"},
    {"id": "distracao", "nome": "Distração"},
    {"id": "bocejo", "nome": "Bocejo", "grupo": "fadiga"},
    {"id": "fadigam", "nome": "Fadiga", "grupo": "fadiga"},
    {"id": "camera", "nome": "Câmera obstruída ou desconectada"},
    {"id": "faixa", "nome": "Ultrapassagem em faixa contínua"},
    {"id": "cigarro", "nome": "Uso de cigarro"},
]
POR_TIPO = {
    "MANUSEIO_CELULAR": "celular", "SEM_CINTO": "cinto", "DISTRACAO_MOTORISTA": "distracao",
    "BOCEJO": "bocejo", "FADIGA_MOTORISTA": "fadigam", "USO_CIGARRO": "cigarro",
    "CAMERA_OBSTRUIDA": "camera", "DESCONEXAO_DA_CAMERA_DO_MOTORISTA": "camera",
    "DESCONEXAO_DA_CAMERA_DA_PISTA": "camera", "DESCONEXAO_DA_CAMERA_DE_AUDITORIA": "camera",
    # Freada, curva e aceleração brusca ficam de fora do painel (pedido do usuário).
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
    if "ULTRAPASSAGEM" in t:  # ultrapassagem em faixa contínua (nome exato ainda não apareceu no BI)
        return "faixa"
    return POR_TIPO.get(t)


def nome_proc(s):
    s = re.sub(r"\s+", " ", (s or "").strip()).upper()
    return s or "SEM PROCESSO"


def linhas(caminho):
    return [{k.strip("[]"): v for k, v in l.items()} for l in json.load(open(caminho, encoding="utf-8"))["data"]["rows"]]


def relatar_mudancas(antes, novo, velho, frotas, ultimo):
    """Mostra o que o Power BI mudou em dias que já estavam salvos (correções antigas)."""
    nomes = {t["id"]: t["nome"] for t in TIPOS}
    ult_salvo = max([d for d, _, _ in antes] or [""])
    mud = []
    for k in sorted(set(antes) | set(novo)):
        d, t, f = k
        if d > ult_salvo:  # dia novo, não é correção
            continue
        dif = novo.get(k, 0) - antes.get(k, 0)
        if dif:
            mud.append("%s/%s %s, frota %s: %+d" % (d[8:10], d[5:7], nomes.get(t, t), f, dif))
    for f, x in sorted(frotas.items()):
        v = velho["frotas"].get(f)
        if v and v.get("processo") != x["processo"]:
            mud.append("frota %s: processo %s -> %s" % (f, v.get("processo"), x["processo"]))
    if mud:
        print("MUDANÇAS em dias já salvos (%d):" % len(mud))
        for m in mud[:30]:
            print("  " + m)
        if len(mud) > 30:
            print("  ... e mais %d" % (len(mud) - 30))
    else:
        print("nenhuma mudança em dias já salvos")


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
    D = json.load(open(destino, encoding="utf-8"))
    # Acumulado: a extração vale para o período que ela cobre (do primeiro dia dela em diante);
    # os dias anteriores já salvos no dados-fonte.json continuam como estavam.
    corte, mantidos = min(dias), 0
    novo = Counter(cont)  # só a extração, para comparar com o que estava salvo
    antes = Counter()
    velho = D.get("comportamento")
    if velho and velho.get("ev"):
        ini_v = date.fromisoformat(velho["inicio"])
        ids_v = [t["id"] for t in velho["tipos"]]
        validos = {t["id"] for t in TIPOS}
        for d0, ti, f, n in velho["ev"]:
            d = (ini_v + timedelta(days=d0)).isoformat()
            if ids_v[ti] not in validos:
                continue
            if d < corte:
                cont[(d, ids_v[ti], f)] += n; dias.add(d); mantidos += n
                if f not in frotas and f in velho["frotas"]:
                    frotas[f] = velho["frotas"][f]
            else:
                antes[(d, ids_v[ti], f)] += n
        relatar_mudancas(antes, novo, velho, frotas, max(d for d, _, _ in novo))

    dias = sorted(dias)
    ini = date.fromisoformat(dias[0])
    tid = {t["id"]: i for i, t in enumerate(TIPOS)}
    # [dia (0 = primeiro dia), tipo, frota, quantidade]
    ev = sorted([[(date.fromisoformat(d) - ini).days, tid[t], f, n] for (d, t, f), n in cont.items()])
    fim = date.fromisoformat(dias[-1])
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
    print("acumulado: %d ocorrências salvas antes de %s mantidas; dali em diante vale o Power BI" % (mantidos, corte))


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
