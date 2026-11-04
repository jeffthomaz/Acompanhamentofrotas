"""Conectividade do painel: base diária por veículo + planilha manual de parados/manutenção.

A base (conectividade_base.json) fica guardada na pasta local do usuário, nunca no repositório.

Comandos:
    python conectividade.py iniciar-bi   <resultado-dax.json> <base.json> [pendencias.json]
    python conectividade.py vfleets      <Localizacao_da_Frota.csv> <base.json>
    python conectividade.py montar       <base.json> <status_frotas.xlsx> <dados-fonte.json>

iniciar-bi: cria a base a partir do Power BI "Conectividade" (consulta em conectividade_do_powerbi.py).
vfleets:    acrescenta (ou substitui) o dia do arquivo "Localização da Frota" exportado do vFleets.
montar:     aplica as regras e grava o bloco "conectividade" no dados-fonte.json.

Regras (mesmas do BI, coluna _STATUS FIXO):
- veículo com "Inativo" no nome (vFleets) fica de fora;
- apelido MANUTENÇÃO ou PARADO no rastreador -> MANUTENÇÃO ou PARADO;
- 2 dias ou mais sem conexão em relação à data do relatório -> OFFLINE; senão CONECTADO;
- processo pela tabela Frotas do BI (cruzando o número da frota).
Regras do painel:
- nos dias vindos do vFleets, quem estava em MANUTENÇÃO/PARADO no dia anterior continua assim
  (o último dia é a referência), até a planilha dizer OPERANDO;
- planilha status_frotas.xlsx: PARADO ou MANUTENÇÃO valem a partir de DESDE (até ATÉ, se houver);
  OPERANDO a partir de DESDE encerra a manutenção/parada.
"""
import csv, json, re, sys
from datetime import date, datetime

import openpyxl

LETRA = {"CONECTADO": "C", "OFFLINE": "O", "MANUTENÇÃO": "M", "PARADO": "P"}


def ler_json(c):
    return json.load(open(c, encoding="utf-8"))


def gravar_json(obj, c):
    json.dump(obj, open(c, "w", encoding="utf-8"), ensure_ascii=False)


def dt(v):
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = str(v or "").strip()
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y", "%Y-%m-%d", "%d/%m/%y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


# ---------- base ----------
def iniciar_bi(origem, base, pend=None):
    rows = [{k.strip("[]"): v for k, v in l.items()} for l in ler_json(origem)["data"]["rows"]]
    B = {"dias": [], "origem": {}, "frotas": {}, "fonte": {}, "atual": {}, "pendencias": []}
    dias = sorted({r["d"] for r in rows if r["d"]})
    B["dias"] = dias
    B["origem"] = {d: "bi" for d in dias}
    di = {d: i for i, d in enumerate(dias)}
    for r in rows:
        f = str(r["f"] or "").strip()
        if not f or not r["d"]:
            continue
        proc = (r["proc"] or "").strip().upper()
        B["frotas"][f] = {"placa": (r["placa"] or "").strip(), "grupo": (r["grupo"] or "").strip().title(),
                          "processo": proc if proc and proc != "0" else "SEM PROCESSO",
                          "responsavel": (r["resp"] or "").strip().title()}
        h = B["fonte"].setdefault(f, ["."] * len(dias))
        h[di[r["d"]]] = LETRA.get((r["st"] or "").strip().upper(), "?")
        if r["d"] == dias[-1]:
            B["atual"][f] = {"dias": r["dias"] or 0, "ult": r["ult"] or "", "sis": (r["sis"] or "").strip().upper(),
                             "mov": (r["mov"] or "").strip().title()}
    B["fonte"] = {f: "".join(h) for f, h in B["fonte"].items()}
    if pend:
        for p in ler_json(pend)["data"]["rows"]:
            p = {k.strip("[]"): v for k, v in p.items()}
            B["pendencias"].append({"f": str(p["f"]).strip(), "d": p["d"], "equip": (p["equip"] or "").title(),
                                    "oc": p["oc"] or "", "classe": p["classe"] or "", "status": (p["status"] or "").strip().title(),
                                    "obs": p["obs"] or ""})
    gravar_json(B, base)
    print("base criada: %d veículos, %d dias (%s a %s)" % (len(B["frotas"]), len(dias), dias[0], dias[-1]))


def vfleets(arquivo, base):
    B = ler_json(base)
    m = re.search(r"(\d{4}-\d{2}-\d{2})T(\d{2})_(\d{2})", arquivo)
    raw = open(arquivo, "rb").read()
    try:
        txt = raw.decode("utf-8")
    except UnicodeDecodeError:
        txt = raw.decode("latin-1")
    linhas = list(csv.DictReader(txt.splitlines(), delimiter=";"))
    if m:
        dia = m.group(1)
    else:  # sem data no nome: usa a conexão mais recente do arquivo
        dia = max(dt(l.get("ÚLTIMA CONEXÃO")) for l in linhas if dt(l.get("ÚLTIMA CONEXÃO"))).isoformat()
    ref = date.fromisoformat(dia)
    if dia not in B["dias"]:
        B["dias"].append(dia); B["dias"].sort()
        i = B["dias"].index(dia)
        B["fonte"] = {f: h[:i] + "." + h[i:] for f, h in B["fonte"].items()}
    i = B["dias"].index(dia)
    B["origem"][dia] = "vfleets"
    inativos, novos, atual = [], [], {}
    for l in linhas:
        veic = (l.get("VEÍCULO") or "").strip()
        if not veic:
            continue
        partes = [p.strip() for p in veic.split(" - ")]
        if any(p.lower() == "inativo" for p in partes):
            inativos.append(partes[0]); continue
        f, placa = partes[0], partes[-1] if len(partes) > 1 else ""
        ap = (l.get("APELIDO") or "").strip().upper().replace("MANUTENCAO", "MANUTENÇÃO")
        u = datetime.strptime(l["ÚLTIMA CONEXÃO"].strip(), "%d/%m/%Y %H:%M:%S") if (l.get("ÚLTIMA CONEXÃO") or "").strip() else None
        dias_off = (ref - u.date()).days if u else 999
        st = "M" if ap == "MANUTENÇÃO" else "P" if ap == "PARADO" else ("O" if dias_off >= 2 else "C")
        if f not in B["frotas"]:
            novos.append(f)
            B["frotas"][f] = {"placa": placa, "grupo": (l.get("GRUPO DE VEÍCULO") or "").strip().title(),
                              "processo": "SEM PROCESSO", "responsavel": ""}
        else:
            B["frotas"][f]["placa"] = placa or B["frotas"][f]["placa"]
        h = B["fonte"].get(f, "." * len(B["dias"]))
        B["fonte"][f] = h[:i] + st + h[i + 1:]
        atual[f] = {"dias": dias_off, "ult": u.strftime("%Y-%m-%d %H:%M") if u else "",
                    "sis": (l.get("STATUS CONEXÃO") or "").strip().upper(), "mov": (l.get("STATUS") or "").strip().title()}
    if dia == B["dias"][-1]:
        B["atual"] = atual
    gravar_json(B, base)
    from collections import Counter
    print("vFleets %s: %d veículos ativos" % (dia, len(atual)), dict(Counter(B["fonte"][f][i] for f in atual)))
    print("inativos fora:", ", ".join(inativos) or "nenhum")
    if novos:
        print("AVISO: frotas sem processo no cadastro do BI:", ", ".join(novos))


# ---------- montar ----------
def ler_planilha(caminho):
    ws = openpyxl.load_workbook(caminho, data_only=True).worksheets[0]
    out, avisos = {}, []
    for n, r in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not r or r[0] in (None, ""):
            continue
        f = str(r[0]).strip().split(".")[0]
        st = str(r[1] or "").strip().upper().replace("MANUTENCAO", "MANUTENÇÃO")
        if st not in ("PARADO", "MANUTENÇÃO", "OPERANDO"):
            avisos.append("linha %d (frota %s): STATUS precisa ser PARADO, MANUTENÇÃO ou OPERANDO" % (n, f)); continue
        out.setdefault(f, []).append({"status": st, "desde": dt(r[2]) or date(2000, 1, 1),
                                      "ate": dt(r[3]) if len(r) > 3 else None,
                                      "obs": str(r[4]).strip() if len(r) > 4 and r[4] else ""})
    for f in out:
        out[f].sort(key=lambda m: m["desde"])
    return out, avisos


def montar(base, planilha, destino):
    B = ler_json(base)
    man, avisos = ler_planilha(planilha)
    dias = B["dias"]
    hist, atual = {}, {}
    for f, src in B["fonte"].items():
        res, ant = [], "."
        for i, d in enumerate(dias):
            s = src[i] if i < len(src) else "."
            if s == ".":
                res.append("."); continue
            dd = date.fromisoformat(d)
            ativo = None  # registro da planilha que vale nesse dia (o mais recente)
            for m in man.get(f, []):
                if m["desde"] <= dd and (not m["ate"] or dd <= m["ate"]):
                    ativo = m
            c = s
            # Último dia é a referência: manutenção/parada continua nos dias do vFleets.
            # (Se veio da planilha, só continua enquanto o período da planilha valer.)
            if B["origem"].get(d) == "vfleets" and s in "CO" and (ant in "MP" or (ant in "mp" and ativo)):
                c = ant
            if ativo:
                c = s if ativo["status"] == "OPERANDO" else ("m" if ativo["status"] == "MANUTENÇÃO" else "p")
            res.append(c)
            ant = c
        hist[f] = "".join(res)
    ultimo = dias[-1]
    for f, a in B["atual"].items():
        x = dict(a)
        x["st"] = hist.get(f, ".")[-1]
        ref = [m for m in man.get(f, []) if m["desde"] <= date.fromisoformat(ultimo) and (not m["ate"] or m["ate"] >= date.fromisoformat(ultimo))]
        if ref:
            m = ref[-1]
            x["manual"] = {"status": m["status"], "desde": m["desde"].strftime("%d/%m/%Y") if m["desde"].year > 2000 else "",
                           "obs": m["obs"], "aplicado": x["st"] in "mp"}
        atual[f] = x
    for f in man:
        if f not in B["frotas"]:
            avisos.append("frota %s está na planilha mas não aparece no rastreamento" % f)
    D = ler_json(destino)
    ini, fim = date.fromisoformat(dias[0]), date.fromisoformat(ultimo)
    D["conectividade"] = {
        "real": True, "fonte": "Power BI Conectividade / vFleets + planilha status_frotas.xlsx",
        "periodo": "%s a %s" % (ini.strftime("%d/%m/%Y"), fim.strftime("%d/%m/%Y")),
        "dias": dias, "frotas": {f: B["frotas"][f] for f in hist}, "hist": hist, "atual": atual,
        "pendencias": B.get("pendencias", []),
    }
    gravar_json(D, destino)
    from collections import Counter
    print("montado até %s:" % ultimo, dict(Counter(x["st"] for x in atual.values())), "| planilha: %d frotas" % len(man))
    for a in avisos:
        print("AVISO:", a)


if __name__ == "__main__":
    cmds = {"iniciar-bi": iniciar_bi, "vfleets": vfleets, "montar": montar}
    if len(sys.argv) < 2 or sys.argv[1] not in cmds:
        sys.exit(__doc__)
    cmds[sys.argv[1]](*sys.argv[2:])
