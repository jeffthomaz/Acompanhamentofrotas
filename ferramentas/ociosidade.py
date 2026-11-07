"""Motor ocioso do painel a partir do arquivo diário "Boletim do Veículo" (exportado do sistema).

Substitui a leitura do Power BI "Ociosidade Frota Leve": as mesmas colunas, direto do arquivo.

Comandos:
    python ociosidade.py boletim <Boletim_do_Veiculo_....csv> [...] <ociosidade_base.json>
    python ociosidade.py montar  <ociosidade_base.json> <dados-fonte.json>

boletim: guarda na base, por veículo e dia, TEMPO IGNIÇÃO LIGADA e PARADO LIGADO. O dia vem do nome do
         arquivo (Boletim_do_Veiculo_AAAA-MM-DD_AAAA-MM-DD.csv) ou da coluna DIA. Um dia que já estava
         na base é substituído pelo arquivo novo. Motoristas e CPF não são lidos nem guardados.
         A base fica só na pasta local do usuário (painel-dados), nunca no repositório.
montar:  aplica a regra da medida "% MOTOR OCIOSO" do relatório (PARADO LIGADO / TEMPO IGNIÇÃO LIGADA),
         só para veículos do grupo VEÍCULOS LEVES, e grava o bloco "motorOcioso" no dados-fonte.json.
         Grupo, processo e responsável vêm do cadastro de frotas que já está no dados-fonte.json
         (tabela Frotas do Power BI, trazida pela conectividade). Frotas de frotas_excluidas.json ficam de fora.
"""
import csv, json, os, re, sys, unicodedata
from datetime import date, timedelta

META_PCT = 15  # meta provisória de motor ocioso (%), a mesma do painel
AQUI = os.path.dirname(os.path.abspath(__file__))


def norm(s):
    return unicodedata.normalize("NFC", str(s or "")).strip()


def segundos(hms):
    m = re.match(r"^\s*(\d+):(\d{2}):(\d{2})", hms or "")
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3)) if m else 0


def ler_boletim(caminho):
    bruto = open(caminho, "rb").read()
    try:
        txt = bruto.decode("utf-8-sig")
    except UnicodeDecodeError:
        txt = bruto.decode("latin-1")
    linhas = list(csv.reader(txt.splitlines(), delimiter=";"))
    cab = [norm(c).upper() for c in linhas[0]]
    for c in ("PREFIXO", "TEMPO IGNIÇÃO LIGADA", "PARADO LIGADO"):
        if c not in cab:
            sys.exit("%s: não parece um Boletim do Veículo (falta a coluna %s)" % (os.path.basename(caminho), c))
    ix = {c: cab.index(c) for c in cab}
    m = re.search(r"(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})", os.path.basename(caminho))
    if m and m.group(1) != m.group(2):
        sys.exit("%s: o arquivo precisa ser de um dia só (início e fim iguais no nome)" % os.path.basename(caminho))
    out = []
    for r in linhas[1:]:
        if not any(c.strip() for c in r):
            continue
        g = lambda c: norm(r[ix[c]]) if c in ix and ix[c] < len(r) else ""
        f = g("PREFIXO")
        if not f or f == "-":
            continue
        d = m.group(1) if m else ""
        if not d:
            dm = re.match(r"(\d{2})/(\d{2})/(\d{4})", g("DIA"))
            d = "%s-%s-%s" % (dm.group(3), dm.group(2), dm.group(1)) if dm else ""
        if not d:
            continue
        out.append({"f": DE_PARA.get(f.upper(), f), "placa": g("PLACA"), "d": d, "i": segundos(g("TEMPO IGNIÇÃO LIGADA")), "p": segundos(g("PARADO LIGADO"))})
    return out


def de_para():
    cam = os.path.join(AQUI, "frotas_de_para.json")
    if not os.path.exists(cam):
        return {}
    return {norm(k).upper(): norm(v) for k, v in json.load(open(cam, encoding="utf-8")).items() if not k.startswith("_")}


DE_PARA = de_para()


def boletim(*args):
    *arquivos, base = args
    B = json.load(open(base, encoding="utf-8")) if os.path.exists(base) else {"linhas": []}
    novas = []
    for a in arquivos:
        ls = ler_boletim(a)
        novas += ls
        print("%s: %d veículos, dia %s" % (os.path.basename(a), len(ls), ", ".join(sorted({l["d"] for l in ls}))))
    dias = {l["d"] for l in novas}
    substituidos = sorted(dias & {l["d"] for l in B["linhas"]})
    B["linhas"] = [l for l in B["linhas"] if l["d"] not in dias] + novas
    B["linhas"].sort(key=lambda l: (l["d"], l["f"]))
    json.dump(B, open(base, "w", encoding="utf-8"), ensure_ascii=False)
    todos = sorted({l["d"] for l in B["linhas"]})
    print("base: %d dias (%s a %s)%s" % (len(todos), todos[0], todos[-1], "; substituídos: " + ", ".join(substituidos) if substituidos else ""))
    falta = [d for d in (date.fromisoformat(todos[0]) + timedelta(days=k) for k in range((date.fromisoformat(todos[-1]) - date.fromisoformat(todos[0])).days + 1))
             if d.isoformat() not in set(todos)]
    if falta:
        print("AVISO: dias sem arquivo na base: " + ", ".join(d.strftime("%d/%m") for d in falta))


def montar(base, destino):
    B = json.load(open(base, encoding="utf-8"))
    D = json.load(open(destino, encoding="utf-8"))
    excl = set()
    cam = os.path.join(AQUI, "frotas_excluidas.json")
    if os.path.exists(cam):
        excl = {norm(f).upper() for f in json.load(open(cam, encoding="utf-8"))["frotas"]}
    cad = D.get("conectividade", {}).get("frotas", {})
    antigo = {v["id"]: v for v in D.get("motorOcioso", {}).get("veiculos", [])}
    pi = {}
    cam_pi = os.path.join(AQUI, "processos_frotas.json")
    if os.path.exists(cam_pi):
        pi = {norm(k): norm(v) for k, v in json.load(open(cam_pi, encoding="utf-8")).items() if not k.startswith("_")}
    def info(f):
        g, p, r = info_cad(f)
        return g, pi.get(f, p), r
    def info_cad(f):
        if f in cad:
            x = cad[f]
            return norm(x.get("grupo")).upper(), x.get("processo") or "Sem processo", (x.get("responsavel") or "").title()
        if f in antigo:  # fora do cadastro da conectividade, mas já estava no motor ocioso (era leve)
            return "VEÍCULOS LEVES", antigo[f]["processo"], antigo[f]["responsavel"]
        return "", "", ""
    linhas, sem_cad = [], set()
    dp = de_para()
    for l in B["linhas"]:
        l = dict(l, f=dp.get(norm(l["f"]).upper(), l["f"]))
        if norm(l["f"]).upper() in excl:
            continue
        grp, proc, resp = info(l["f"])
        if not grp:
            sem_cad.add(l["f"])
        if grp != "VEÍCULOS LEVES" or (l["i"] <= 0 and l["p"] <= 0):
            continue
        linhas.append(dict(l, proc=proc, resp=resp))
    dias = sorted({date.fromisoformat(l["d"]) for l in linhas})
    ini, fim = dias[0], dias[-1]
    # Semanas de segunda a domingo, rotuladas pelo primeiro dia dentro do período (igual ao script do Power BI).
    seg0 = ini - timedelta(days=ini.weekday())
    nsem = (fim - seg0).days // 7 + 1
    rot = [max(seg0 + timedelta(weeks=k), ini).strftime("%d/%m") for k in range(nsem)]
    # Últimos 14 dias corridos, dia a dia, para o Resumo (últimos 7 dias comparados aos 7 anteriores).
    ult = [(fim - timedelta(days=13 - k)).isoformat() for k in range(14)]
    ix_ult = {d: k for k, d in enumerate(ult)}
    v = {}
    for l in linhas:
        x = v.setdefault(l["f"], {"id": l["f"], "placa": l["placa"], "processo": l["proc"], "responsavel": l["resp"],
                                  "dias": set(), "i": [0] * nsem, "p": [0] * nsem, "di": [0] * 14, "dp": [0] * 14})
        d = date.fromisoformat(l["d"])
        k = (d - seg0).days // 7
        x["i"][k] += l["i"]; x["p"][k] += l["p"]
        if l["d"] in ix_ult:
            x["di"][ix_ult[l["d"]]] += l["i"]; x["dp"][ix_ult[l["d"]]] += l["p"]
        if l["i"] > 0:
            x["dias"].add(d)
    veiculos = [{"id": x["id"], "placa": x["placa"], "processo": x["processo"], "responsavel": x["responsavel"], "dias": len(x["dias"]),
                 "ligado": [round(s / 3600, 2) for s in x["i"]], "ocioso": [round(s / 3600, 2) for s in x["p"]],
                 "dl": [round(s / 3600, 2) for s in x["di"]], "do": [round(s / 3600, 2) for s in x["dp"]]}
                for x in v.values()]
    veiculos.sort(key=lambda x: x["id"])
    D["motorOcioso"] = {
        "real": True,
        "fonte": "Boletim do Veículo (arquivo diário)",
        "periodo": "%s a %s" % (ini.strftime("%d/%m/%Y"), fim.strftime("%d/%m/%Y")),
        "metaPct": META_PCT,
        "semanas": rot,
        "inicioSemana": seg0.isoformat(),
        "diasIncluidos": [d.isoformat() for d in dias],
        "ultDias": ult,
        "veiculos": veiculos,
    }
    json.dump(D, open(destino, "w", encoding="utf-8"), ensure_ascii=False)
    li = sum(sum(x["ligado"]) for x in veiculos); oc = sum(sum(x["ocioso"]) for x in veiculos)
    print("motor ocioso: %d veículos leves, %d semanas, %s; ocioso %.2f%%" % (len(veiculos), nsem, D["motorOcioso"]["periodo"], oc / li * 100 if li else 0))
    if sem_cad:
        print("AVISO: frotas do boletim sem cadastro (grupo desconhecido, ficaram fora): " + ", ".join(sorted(sem_cad)[:15]) + (" ..." if len(sem_cad) > 15 else ""))


if __name__ == "__main__":
    cmds = {"boletim": boletim, "montar": montar}
    if len(sys.argv) < 4 or sys.argv[1] not in cmds:
        sys.exit(__doc__)
    cmds[sys.argv[1]](*sys.argv[2:])
