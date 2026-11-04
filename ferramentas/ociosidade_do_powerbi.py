"""Converte a extração do Power BI "Ociosidade Frota Leve" no bloco motorOcioso do dados-fonte.json.

Uso:
    python ociosidade_do_powerbi.py <resultado-dax.json> <dados-fonte.json>

<resultado-dax.json> é o resultado (JSON com data.rows) desta consulta DAX no modelo:

    DEFINE
    VAR B = FILTER(ADDCOLUMNS('Base ociosidade da frota',
        "grp",  LOOKUPVALUE(Frotas[GRUPO], Frotas[FROTA], 'Base ociosidade da frota'[PREFIXO]),
        "proc", LOOKUPVALUE(Frotas[PROCESSO], Frotas[FROTA], 'Base ociosidade da frota'[PREFIXO]),
        "resp", LOOKUPVALUE(Frotas[RESPONSÁVEL], Frotas[FROTA], 'Base ociosidade da frota'[PREFIXO]),
        "ig", HOUR([TEMPO IGNIÇÃO LIGADA])*3600+MINUTE([TEMPO IGNIÇÃO LIGADA])*60+SECOND([TEMPO IGNIÇÃO LIGADA]),
        "pl", HOUR([PARADO LIGADO])*3600+MINUTE([PARADO LIGADO])*60+SECOND([PARADO LIGADO])),
        [grp] = "VEÍCULOS LEVES")
    EVALUATE SELECTCOLUMNS(FILTER(B, [ig] > 0 || [pl] > 0),
        "f", [PREFIXO], "placa", [PLACA], "proc", [proc], "resp", [resp],
        "d", FORMAT([DIA], "yyyy-mm-dd"), "i", [ig], "p", [pl])

Mesma regra da medida "% MOTOR OCIOSO" do relatório: PARADO LIGADO / TEMPO IGNIÇÃO LIGADA,
só veículos do grupo VEÍCULOS LEVES.
"""
import json, sys
from datetime import date, timedelta

META_PCT = 15  # meta provisória de motor ocioso (%)


def main(origem, destino):
    linhas = json.load(open(origem, encoding="utf-8"))["data"]["rows"]
    linhas = [{k.strip("[]"): v for k, v in l.items()} for l in linhas]
    dias = sorted({date.fromisoformat(l["d"]) for l in linhas})
    ini, fim = dias[0], dias[-1]
    # Semanas de segunda a domingo, rotuladas pelo primeiro dia dentro do período.
    seg0 = ini - timedelta(days=ini.weekday())
    nsem = (fim - seg0).days // 7 + 1
    rot = [max(seg0 + timedelta(weeks=k), ini).strftime("%d/%m") for k in range(nsem)]

    v = {}
    for l in linhas:
        x = v.setdefault(l["f"], {"id": l["f"], "placa": l["placa"] or "", "processo": l["proc"] or "Sem processo",
                                  "responsavel": (l["resp"] or "").title(), "dias": set(), "i": [0] * nsem, "p": [0] * nsem})
        d = date.fromisoformat(l["d"])
        k = (d - seg0).days // 7
        x["i"][k] += l["i"]; x["p"][k] += l["p"]
        if l["i"] > 0:
            x["dias"].add(d)
    veiculos = []
    for x in v.values():
        veiculos.append({"id": x["id"], "placa": x["placa"], "processo": x["processo"], "responsavel": x["responsavel"],
                         "dias": len(x["dias"]),
                         "ligado": [round(s / 3600, 2) for s in x["i"]], "ocioso": [round(s / 3600, 2) for s in x["p"]]})
    veiculos.sort(key=lambda x: x["id"])

    D = json.load(open(destino, encoding="utf-8"))
    D["motorOcioso"] = {
        "real": True,
        "fonte": "Power BI Ociosidade Frota Leve",
        "periodo": "%s a %s" % (ini.strftime("%d/%m/%Y"), fim.strftime("%d/%m/%Y")),
        "metaPct": META_PCT,
        "semanas": rot,
        "veiculos": veiculos,
    }
    json.dump(D, open(destino, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    li = sum(sum(x["ligado"]) for x in veiculos); oc = sum(sum(x["ocioso"]) for x in veiculos)
    print("%d veículos, %d semanas, %s; motor ocioso %.2f%%" % (len(veiculos), nsem, D["motorOcioso"]["periodo"], oc / li * 100))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
