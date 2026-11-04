"""Converte as permanências (tabela Ocorrências do Power BI "Ociosidade Frota Leve") no bloco
permanencia do dados-fonte.json. Não leva motorista nem CPF.

Uso:
    python permanencia_do_powerbi.py <resultado-dax.json> <dados-fonte.json>

Consulta DAX usada:

    EVALUATE SELECTCOLUMNS('Ocorrências',
        "f", [PREFIXO], "placa", [PLACA], "grupo", [GRUPO],
        "proc", RELATED(Frotas[PROCESSO]), "resp", RELATED(Frotas[RESPONSÁVEL]),
        "tipo", [TIPO], "ponto", [PONTO_REFERENCIA], "cerca", [CERCA ELETRÔNICA], "cat", [CATEGORIA],
        "cid", [CIDADE], "lim", [LIMIAR], "rot", [RÓTULO], "lat", [LAT], "lon", [LOG],
        "dur", HOUR([DURACAO])*3600+MINUTE([DURACAO])*60+SECOND([DURACAO]),
        "d", FORMAT([DATA], "yyyy-mm-dd"), "h", FORMAT([HORA], "hh:nn"))

Ficam de fora: alarmes marcados como "ALARME FALSO" e os pontos de "Liberação"
(Liberação Uberlândia, Liberação de velocidade, Liberação MG 223 etc.).
"""
import html, json, sys
from collections import Counter
from datetime import date


def limpo(s):
    s = html.unescape(s or "").strip().rstrip(".").strip()
    return "" if s in ("-", "") else s


def main(origem, destino):
    rows = [{k.strip("[]"): v for k, v in l.items()} for l in json.load(open(origem, encoding="utf-8"))["data"]["rows"]]
    rows = [r for r in rows if limpo(r["rot"]) != "ALARME FALSO" and r["lat"] and r["lon"]]
    locais, idx, veiculos, eventos, cidades = [], {}, {}, [], {}
    datas = sorted({r["d"] for r in rows})  # período completo do relatório
    for r in rows:
        if limpo(r["ponto"]).upper().startswith(("LIBERAÇÃO", "LIBERACAO")):
            continue
        # O local é a CERCA ELETRÔNICA; sem cerca, usa o ponto de referência.
        nome = limpo(r["cerca"]) or limpo(r["ponto"]) or ("Sem cerca, " + limpo(r["cid"]).title())
        chave = nome
        cidades.setdefault(chave, Counter())[limpo(r["cid"]).title()] += 1
        if chave not in idx:
            idx[chave] = len(locais)
            locais.append({"nome": nome, "cidade": limpo(r["cid"]).title(), "categoria": limpo(r["cat"]).title(),
                           "cerca": bool(limpo(r["cerca"]))})
        f = r["f"]
        veiculos.setdefault(f, {"placa": r["placa"] or "", "processo": r["proc"] or "Sem processo",
                                "responsavel": (r["resp"] or "").title()})
        # [frota, lat, lon, minutos, local, dia (yyyy-mm-dd), hora]
        eventos.append([f, round(float(r["lat"]), 6), round(float(r["lon"]), 6), round(r["dur"] / 60, 1),
                        idx[chave], r["d"], r["h"]])
    for k, i in idx.items():
        locais[i]["cidade"] = cidades[k].most_common(1)[0][0]
    eventos.sort(key=lambda e: (e[5], e[6]))
    D = json.load(open(destino, encoding="utf-8"))
    ini, fim = date.fromisoformat(datas[0]), date.fromisoformat(datas[-1])
    D["permanencia"] = {
        "real": True,
        "fonte": "Power BI Ociosidade Frota Leve, tabela Ocorrências",
        "periodo": "%s a %s" % (ini.strftime("%d/%m/%Y"), fim.strftime("%d/%m/%Y")),
        "locais": locais, "veiculos": veiculos, "eventos": eventos,
    }
    json.dump(D, open(destino, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("%d permanências, %d locais, %d frotas, %s" % (len(eventos), len(locais), len(veiculos), D["permanencia"]["periodo"]))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
