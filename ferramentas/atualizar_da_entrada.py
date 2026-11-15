"""Atualização pelo botão "Atualizar dados" do painel.

Roda no GitHub Actions do repositório PRIVADO painel-frotas-dados (workflow atualizar.yml).
O navegador de quem clicou lê as planilhas na pasta do OneDrive dele, tira os dados pessoais
(motorista, CPF, comentários, nomes de pessoas nas cercas) e manda só o necessário em
entrada/pedido.json.gz. Este script refaz o dados-fonte.json com os mesmos scripts de sempre.

Uso:
    python atualizar_da_entrada.py <pedido.json.gz> <pasta-base>

<pasta-base> tem dados-fonte.json, permanencia_base.json e ociosidade_base.json; ao fim grava
também indice.json, que o navegador lê para mandar só o que mudou.
"""
import csv, gzip, json, os, sys, tempfile
from datetime import datetime

import openpyxl

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

import comportamento_da_planilha
import ociosidade
import permanencia_dos_csv


def escrever_csv(caminho, h, linhas):
    with open(caminho, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(h)
        w.writerows(linhas)


def comportamento(P, dados):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    for nome, aba in P["abas"].items():
        ws = wb.create_sheet(nome)
        ws.append(["(montado a partir dos dados enviados pelo painel)"])
        ws.append(aba["h"])
        iD = aba["h"].index("DATA")
        for r in aba["r"]:
            r = list(r)
            if r[iD]:
                r[iD] = datetime.fromisoformat(r[iD])
            ws.append(r)
    ws = wb.create_sheet("BASE DE INFORMAÇÃO")
    ws.append(["PREFIXO", "", "", "PROCESSO"])
    for f, p in P["base"]:
        ws.append([f, "", "", p])
    comportamento_da_planilha.processar(wb, dados)


def permanencia(P, dados):
    with tempfile.TemporaryDirectory() as tmp:
        assin = {}
        for nome, a in P["arquivos"].items():
            escrever_csv(os.path.join(tmp, os.path.basename(nome)), a["h"], a["r"])
            assin[os.path.basename(nome)] = a["tam"]
        permanencia_dos_csv.main(tmp, dados, assinaturas=assin)


def boletins(P, base, dados):
    with tempfile.TemporaryDirectory() as tmp:
        arqs = []
        for nome, a in sorted(P.items()):
            c = os.path.join(tmp, os.path.basename(nome))
            escrever_csv(c, a["h"], a["r"])
            arqs.append(c)
        ociosidade.boletim(*arqs, os.path.join(base, "ociosidade_base.json"))
    ociosidade.montar(os.path.join(base, "ociosidade_base.json"), dados)


def main(pedido, base):
    P = json.loads(gzip.open(pedido).read().decode("utf-8"))
    dados = os.path.join(base, "dados-fonte.json")
    ind_c = os.path.join(base, "indice.json")
    ind = json.load(open(ind_c, encoding="utf-8")) if os.path.exists(ind_c) else {}
    feito = []
    if P.get("comportamento"):
        print("== Comportamental")
        comportamento(P["comportamento"], dados)
        ind["comportamento"] = P["comportamento"]["arquivo"]
        feito.append("Comportamental")
    if P.get("permanencia") and P["permanencia"]["arquivos"]:
        print("== Permanência")
        permanencia(P["permanencia"], dados)
        feito.append("Permanência")
    if P.get("boletins"):
        print("== Motor ocioso")
        boletins(P["boletins"], base, dados)
        feito.append("Motor ocioso")
    cache = os.path.join(base, "permanencia_base.json")
    if os.path.exists(cache):
        ind["permanencia"] = json.load(open(cache, encoding="utf-8"))["arquivos"]
    oc = os.path.join(base, "ociosidade_base.json")
    if os.path.exists(oc):
        ind["boletins"] = sorted({l["d"] for l in json.load(open(oc, encoding="utf-8"))["linhas"]})
    ind["atualizado"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    ind["ultimo_pedido"] = {"quando": P.get("quando"), "feito": feito}
    json.dump(ind, open(ind_c, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("feito: " + (", ".join(feito) or "nada novo"))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
