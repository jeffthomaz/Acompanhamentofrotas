"""Conectividade do painel: base diária por veículo + planilha manual de parados/manutenção.

A base (conectividade_base.json) fica guardada na pasta local do usuário, nunca no repositório.

Comandos:
    python conectividade.py iniciar-bi   <resultado-dax.json> <base.json> [pendencias.json]
    python conectividade.py vfleets      <Localizacao_da_Frota.csv> <base.json>
    python conectividade.py montar       <base.json> <status_frotas.xlsx> <dados-fonte.json>
    python conectividade.py excluir      <frota> <base.json>        (desconsiderar um equipamento)
    python conectividade.py planilha     <dados-fonte.json> <status_frotas.xlsx>  (pré-preenche a planilha)

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


def excluir(frota, base):
    B = ler_json(base)
    B["excluidos"] = sorted(set(B.get("excluidos", [])) | {frota.strip()})
    gravar_json(B, base)
    print("desconsiderados:", ", ".join(B["excluidos"]))


# ---------- montar ----------
def ler_planilha(caminho):
    """Lê status_frotas.xlsx pelos nomes das colunas (FROTA, STATUS e, se houver, DESDE, ATÉ, OBSERVAÇÃO).

    STATUS em branco ou OFFLINE não muda nada (é só a situação que o painel mostrou). Sem coluna DESDE,
    a data em que o status passou a valer é guardada pelo painel na base (ver montar).
    """
    ws = openpyxl.load_workbook(caminho, data_only=True).worksheets[0]
    linhas = list(ws.iter_rows(values_only=True))
    cab = [str(c or "").strip().upper() for c in (linhas[0] if linhas else [])]
    col = lambda nome: cab.index(nome) if nome in cab else None
    iF, iS, iD, iA, iO = col("FROTA"), col("STATUS"), col("DESDE"), col("ATÉ"), col("OBSERVAÇÃO")
    out, avisos = {}, []
    if iF is None or iS is None:
        return out, ["planilha sem as colunas FROTA e STATUS"]
    for n, r in enumerate(linhas[1:], start=2):
        g = lambda i: r[i] if i is not None and i < len(r) else None
        if g(iF) in (None, ""):
            continue
        f = str(g(iF)).strip().split(".")[0]
        st = str(g(iS) or "").strip().upper().replace("MANUTENCAO", "MANUTENÇÃO")
        if not st or st == "OFFLINE":
            continue
        if st not in ("PARADO", "MANUTENÇÃO", "OPERANDO"):
            avisos.append("linha %d (frota %s): STATUS precisa ser PARADO, MANUTENÇÃO, OPERANDO ou OFFLINE" % (n, f)); continue
        out.setdefault(f, []).append({"status": st, "desde": dt(g(iD)), "ate": dt(g(iA)),
                                      "obs": str(g(iO)).strip() if g(iO) else ""})
    for f in out:
        out[f].sort(key=lambda m: m["desde"] or date(2000, 1, 1))
    return out, avisos


def montar(base, planilha, destino):
    B = ler_json(base)
    man, avisos = ler_planilha(planilha)
    dias = B["dias"]
    # Linha sem DESDE: vale desde o dia em que o status apareceu na planilha (guardado na base).
    memo, novo_memo = B.get("manual_desde", {}), {}
    for f, ms in man.items():
        for m in ms:
            if m["desde"] is None:
                x = memo.get(f)
                m["desde"] = date.fromisoformat(x["desde"]) if x and x["status"] == m["status"] else date.fromisoformat(dias[-1])
                novo_memo[f] = {"status": m["status"], "desde": m["desde"].isoformat()}
    B["manual_desde"] = novo_memo
    gravar_json(B, base)
    hist, atual = {}, {}
    fora = set(B.get("excluidos", []))
    for f, src in B["fonte"].items():
        if f in fora:
            continue
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
        if f in fora:
            continue
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


def planilha(destino, caminho):
    """Refaz status_frotas.xlsx com o status de cada equipamento na última atualização, para o usuário conferir.

    Colunas: FROTA, STATUS, DIAS OFFLINE, RESPONSÁVEL, OBSERVAÇÃO. Entram os equipamentos em manutenção,
    parados ou offline há 2 dias ou mais (quem você marcou OPERANDO continua com OPERANDO enquanto ainda
    aparecer nessa situação; quando conecta, sai da lista). STATUS vem preenchido com a situação atual (MANUTENÇÃO, PARADO ou OFFLINE);
    o usuário confere e troca quando precisar. OFFLINE não muda nada; PARADO/MANUTENÇÃO/OPERANDO valem.
    A OBSERVAÇÃO escrita pelo usuário é mantida.
    """
    import os
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.worksheet.datavalidation import DataValidation
    K = ler_json(destino)["conectividade"]
    aqui = os.path.dirname(os.path.abspath(__file__))
    fora_c = os.path.join(aqui, "frotas_excluidas.json")
    fora = {f.strip().upper() for f in ler_json(fora_c)["frotas"]} if os.path.exists(fora_c) else set()
    wb = openpyxl.load_workbook(caminho)
    ws = wb["STATUS"] if "STATUS" in wb.sheetnames else wb.worksheets[0]
    linhas = list(ws.iter_rows(values_only=True))
    cab = [str(c or "").strip().upper() for c in (linhas[0] if linhas else [])]
    iF, iS, iO = [cab.index(n) if n in cab else None for n in ("FROTA", "STATUS", "OBSERVAÇÃO")]
    antes = {}
    for r in linhas[1:]:
        if iF is not None and iF < len(r) and r[iF] not in (None, ""):
            f = str(r[iF]).strip().split(".")[0]
            antes[f] = {"st": str(r[iS] or "").strip().upper() if iS is not None and iS < len(r) else "",
                        "obs": r[iO] if iO is not None and iO < len(r) else None}
    nome = {"M": "MANUTENÇÃO", "P": "PARADO", "m": "MANUTENÇÃO", "p": "PARADO"}
    lst = []
    for f, a in K["atual"].items():
        if f.upper() in fora:
            continue
        st, dias = a.get("st") or "", a.get("dias", 0) or 0
        if st and st in "MPmp":
            status = nome[st]
        elif st == "O" or dias >= 2:
            status = "OFFLINE"
        else:  # conectado: sai da lista (inclusive quem você marcou OPERANDO e já voltou)
            continue
        if antes.get(f, {}).get("st") == "OPERANDO" and status != "OFFLINE":
            status = "OPERANDO"
        v = K["frotas"].get(f, {})
        resp = str(v.get("responsavel") or "").strip()
        lst.append([f, status, dias, resp.title() if resp and resp != "0" else "", antes.get(f, {}).get("obs")])
    ordem = {"MANUTENÇÃO": 0, "PARADO": 1, "OFFLINE": 2, "OPERANDO": 3}
    lst.sort(key=lambda x: (ordem[x[1]], -x[2], x[0]))
    ws.delete_rows(1, ws.max_row)
    ws.delete_cols(1, max(ws.max_column, 10))
    hf, hfill = Font(bold=True, color="FFFFFF"), PatternFill("solid", fgColor="0F4A2A")
    for i, c in enumerate(["FROTA", "STATUS", "DIAS OFFLINE", "RESPONSÁVEL", "OBSERVAÇÃO"]):
        cel = ws.cell(1, 1 + i, c); cel.font = hf; cel.fill = hfill; cel.alignment = Alignment(vertical="center")
    for col, w in zip("ABCDEFGHIJ", [11, 16, 14, 24, 50, 9, 9, 9, 9, 9]):
        ws.column_dimensions[col].width = w
    amarelo = PatternFill("solid", fgColor="FFF4CE")
    for k, (f, status, dias, resp, obs) in enumerate(lst, start=2):
        ws.cell(k, 1, int(f) if f.isdigit() else f)
        c = ws.cell(k, 2, status); c.fill = amarelo
        ws.cell(k, 3, dias)
        ws.cell(k, 4, resp)
        ws.cell(k, 5, obs)
    ws.data_validations.dataValidation = []
    dv = DataValidation(type="list", formula1='"MANUTENÇÃO,PARADO,OPERANDO,OFFLINE"', allow_blank=True)
    dv.add("B2:B1000"); ws.add_data_validation(dv)
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = "A1:E%d" % max(len(lst) + 1, 1)
    if "COMO USAR" in wb.sheetnames:
        cu = wb["COMO USAR"]
        cu.delete_rows(1, cu.max_row)
        for t in ["Como usar esta planilha", "",
                  "A planilha já abre com o STATUS de cada equipamento na última atualização do painel:",
                  "os que estão em MANUTENÇÃO, PARADO ou OFFLINE há 2 dias ou mais.",
                  "Confira um por um e troque o STATUS quando estiver diferente:",
                  "  MANUTENÇÃO ou PARADO: o painel passa a mostrar assim (informado na planilha).",
                  "  OPERANDO: o equipamento voltou a operar (encerra a manutenção ou a parada).",
                  "  OFFLINE: só a situação que o painel mostrou; não muda nada.",
                  "DIAS OFFLINE e RESPONSÁVEL: informação do painel.",
                  "OBSERVAÇÃO: opcional (ex.: oficina, entressafra). Não coloque nome de pessoas. Fica guardada.",
                  "", "O painel lê esta planilha e a refaz nas atualizações das 11h, 13h e 14h (dias úteis)."]:
            cu.append([t])
    wb.save(caminho)
    from collections import Counter
    print("planilha: %d equipamentos %s" % (len(lst), dict(Counter(x[1] for x in lst))))

if __name__ == "__main__":
    cmds = {"iniciar-bi": iniciar_bi, "vfleets": vfleets, "montar": montar, "excluir": excluir, "planilha": planilha}
    if len(sys.argv) < 2 or sys.argv[1] not in cmds:
        sys.exit(__doc__)
    cmds[sys.argv[1]](*sys.argv[2:])
