"""Atualização pelo botão "Atualizar dados" do painel.

Roda no GitHub Actions do repositório PRIVADO painel-frotas-dados (workflow atualizar.yml).
O navegador de quem clicou lê as planilhas na pasta do OneDrive dele, tira os dados pessoais
(motorista, CPF, comentários, nomes de pessoas nas cercas) e manda só o necessário em
entrada/pedido.json.gz. Este script refaz o dados-fonte.json com os mesmos scripts de sempre:
Conectividade (Localização da Frota + status_frotas.xlsx), Câmeras (Saúde do Veículo), Comportamental
(planilha Nova), Permanência (alertas) e Motor ocioso (Boletim do Veículo).

Uso:
    python atualizar_da_entrada.py <pedido.json.gz> <pasta-base>

<pasta-base> tem dados-fonte.json, permanencia_base.json e ociosidade_base.json; ao fim grava
também indice.json, que o navegador lê para mandar só o que mudou.
"""
import base64, csv, gzip, json, os, sys, tempfile
from datetime import datetime

import openpyxl

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

import cameras
import comportamento_da_planilha
import conectividade
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


def conectividade_e_cameras(P, base, dados, proc):
    """Localização da Frota (vFleets), status_frotas.xlsx e Saúde do Veículo, como na atualização das 12h/13h."""
    feito = []
    with tempfile.TemporaryDirectory() as tmp:
        cb = os.path.join(base, "conectividade_base.json")
        if P.get("conectividade"):
            a = P["conectividade"]
            c = os.path.join(tmp, os.path.basename(a["nome"]))
            escrever_csv(c, a["h"], a["r"])
            conectividade.vfleets(c, cb)
            proc["processados"].append("%s|%s" % (a["nome"], a["mod"]))
        if P.get("status_frotas"):
            st = os.path.join(tmp, "status_frotas.xlsx")
            open(st, "wb").write(base64.b64decode(P["status_frotas"]["b64"]))
            conectividade.montar(cb, st, dados)
            proc["status_frotas"] = P["status_frotas"]["mod"]
            feito.append("Conectividade")
        if P.get("cameras"):
            a = P["cameras"]
            c = os.path.join(tmp, os.path.basename(a["nome"]))
            escrever_csv(c, a["h"], a["r"])
            cameras.main(c, dados)
            proc["processados"].append("%s|%s" % (a["nome"], a["mod"]))
            feito.append("Câmeras")
    return feito


def main(pedido, base):
    P = json.loads(gzip.open(pedido).read().decode("utf-8"))
    dados = os.path.join(base, "dados-fonte.json")
    ind_c = os.path.join(base, "indice.json")
    ind = json.load(open(ind_c, encoding="utf-8")) if os.path.exists(ind_c) else {}
    proc_c = os.path.join(base, "entrada_processados.json")
    proc = json.load(open(proc_c, encoding="utf-8")) if os.path.exists(proc_c) else {"processados": []}
    feito = []
    if P.get("conectividade") or P.get("status_frotas") or P.get("cameras"):
        print("== Conectividade e Câmeras")
        feito += conectividade_e_cameras(P, base, dados, proc)
        json.dump(proc, open(proc_c, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
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
    ind["processados"] = proc.get("processados", [])
    ind["status_frotas"] = proc.get("status_frotas")
    ind["atualizado"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    ind["ultimo_pedido"] = {"quando": P.get("quando"), "quem": P.get("quem", ""), "feito": feito}
    # Resumo para o aviso no Teams (workflow) e para o histórico
    hist = ind.setdefault("historico", [])
    hist.insert(0, {"quando": datetime.now().strftime("%d/%m/%Y %H:%M"), "quem": P.get("quem", ""), "feito": feito})
    del hist[50:]
    json.dump(ind, open(ind_c, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("feito: " + (", ".join(feito) or "nada novo"))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
