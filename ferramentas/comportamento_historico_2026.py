"""Teste de 11/11/2026: junta ao Comportamental as ocorrências de 02/01 a 31/07/2026 da planilha antiga
"Ocorrências monitoramento 2026.xlsx" (abas OCORRÊNCIAS FROTA LEVE / PESADA), com as mesmas regras da
planilha Nova. Depois disso, rodar comportamento_da_planilha.py normalmente (ele mantém os dias antes de 01/08,
inclusive os pontos do mapa de calor) para ficar com o processo atual de cada frota.

Uso: python comportamento_historico_2026.py "<Nova..xlsx>" "<Ocorrências monitoramento 2026.xlsx>" <dados-fonte.json>
"""
import sys, json, openpyxl
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import comportamento_da_planilha as cp
from comportamento_do_powerbi import montar, nome_proc
from collections import Counter
NOVA, ANT, DEST = sys.argv[1:4]
corr = cp.correcoes()
wn = openpyxl.load_workbook(NOVA, read_only=True, data_only=True)
wa = openpyxl.load_workbook(ANT, read_only=True, data_only=True)
def base(wb):
    ws = next(ws for ws in wb.worksheets if ws.title.strip().upper().startswith("BASE DE INFORMA"))
    return {cp.txt(x[0]): nome_proc(x[3]) for x in ws.iter_rows(min_row=2, values_only=True) if x[0] and x[3]}
B = base(wa); B.update(base(wn))
nl, np_ = cp.aba(wn, "Frota Leve", True, corr), cp.aba(wn, "Frota Pesada", False, corr)
ini = min(r["d"] for r in nl + np_)
al, ap = cp.aba(wa, "OCORRÊNCIAS FROTA LEVE", True, corr), cp.aba(wa, "OCORRÊNCIAS FROTA PESADA", False, corr)
gmap = {}
for r in nl + np_:
    if r["ger"]: gmap.setdefault(r["f"], Counter())[r["ger"]] += 1
gmap = {f: c.most_common(1)[0][0] for f, c in gmap.items()}
ws = next(ws for ws in wa.worksheets if ws.title.strip().upper().startswith("BASE DE INFORMA"))
for x in ws.iter_rows(min_row=2, values_only=True):
    if x[0] and len(x) > 5 and x[5] and cp.txt(x[0]) not in gmap: gmap[cp.txt(x[0])] = cp.txt(x[5])
for r in al + ap:
    if not r["ger"]: r["ger"] = gmap.get(r["f"], "")
al = [r for r in al if r["d"] < ini]; ap = [r for r in ap if r["d"] < ini]
print("Nova começa em", ini, "| antiga antes disso:", len(al), "leves", len(ap), "pesadas",
      min(r["d"] for r in al + ap), max(r["d"] for r in al + ap))
print("meses:", sorted(Counter(r["d"][:7] for r in al + ap).items()))
print("leves sem processo:", sum(1 for r in al if not r["proc"]), "sem gerencia:", sum(1 for r in al + ap if not r["ger"]))
montar(al + nl, ap + np_, B, DEST, manter_faixa=False)
