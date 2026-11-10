"""Monta o bloco "comportamento" do dados-fonte.json a partir da planilha
"Ocorrências monitoramento comportamental Nova..xlsx" (fonte do Comportamental desde 10/11/2026,
no lugar dos dois Power BI). Não leva motorista, CPF nem comentários.

Uso:
    python comportamento_da_planilha.py "<Ocorrências monitoramento comportamental Nova..xlsx>" <dados-fonte.json>

Abas usadas: "Frota Leve" e "Frota Pesada" (cabeçalho na linha 2) e "BASE DE INFORMAÇÃO" (processo de
cada frota pesada). Mesmas regras de comportamento_do_powerbi.py: faixas de excesso de velocidade da
nova política, só ALARME VERDADEIRO e não desconsiderado, sem freada/curva/aceleração brusca.
A planilha tem o ano todo, então ela substitui o que estava salvo do primeiro dia dela em diante.
Ultrapassagem em faixa contínua não está na planilha: continua vindo das tabelas de e-mail dos PBI
(comportamento_do_powerbi.py --faixa) e é mantida.
"""
import sys
from datetime import date, datetime

import openpyxl

from comportamento_do_powerbi import montar, nome_proc


def txt(v):
    return "" if v is None else str(v).strip()


def aba(wb, nome, leve):
    ws = wb[nome]
    it = ws.iter_rows(min_row=2, values_only=True)
    H = [txt(h).upper() for h in next(it)]
    ix = {h: i for i, h in enumerate(H)}
    def col(r, *nomes):
        for n in nomes:
            if n in ix and ix[n] < len(r):
                return r[ix[n]]
        return None
    out = []
    for r in it:
        f = txt(col(r, "PREFIXO"))
        d = col(r, "DATA")
        if not f or not isinstance(d, (date, datetime)):
            continue
        out.append({
            "f": f, "placa": txt(col(r, "PLACA")), "grupo": txt(col(r, "GRUPO")), "tipo": txt(col(r, "TIPO")),
            "lim": txt(col(r, "LIMIAR")), "exc": txt(col(r, "EXCESSO")), "d": d.strftime("%Y-%m-%d"),
            "proc": txt(col(r, "PROCESSO")) if leve else None, "ger": txt(col(r, "GERENCIA", "GERÊNCIA")),
            "rot": txt(col(r, "RÓTULO")) or None, "desc": txt(col(r, "ALERTA DESCONSIDERADO")) or None,
        })
    return out


def main(planilha, destino):
    wb = openpyxl.load_workbook(planilha, read_only=True, data_only=True)
    base_ws = next(ws for ws in wb.worksheets if ws.title.strip().upper().startswith("BASE DE INFORMA"))
    base = {txt(x[0]): nome_proc(x[3]) for x in base_ws.iter_rows(min_row=2, values_only=True) if x[0]}
    leves, pesadas = aba(wb, "Frota Leve", True), aba(wb, "Frota Pesada", False)
    print("planilha: %d linhas de frota leve, %d de frota pesada" % (len(leves), len(pesadas)))
    montar(leves, pesadas, base, destino)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
