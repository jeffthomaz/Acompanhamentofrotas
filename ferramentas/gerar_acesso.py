"""Gera acesso.js: os dados do painel criptografados por grupo de processos.

Uso:
    python gerar_acesso.py <cadastros.xlsx> <dados-fonte.json> <saida/acesso.js>

cadastros.xlsx: colunas USUARIO, PROCESSO, SENHA (primeira aba).
  PROCESSO = "todos" vê tudo. Vários processos: separe com ";".
dados-fonte.json: os dados em texto puro (mesma estrutura do antigo dados.js).
  Esse arquivo NUNCA deve ir para o repositório.

Nada em acesso.js revela senhas, nomes de usuário ou dados sem a senha certa:
- cada grupo de processos tem uma chave aleatória (AES-256-GCM) que tranca os dados dele;
- cada usuário recebe essa chave trancada com uma chave derivada da senha (PBKDF2-SHA256);
- o usuário aparece só como hash, para a lista de nomes não ficar exposta.
"""
import base64, hashlib, json, os, sys, unicodedata
from datetime import datetime

import openpyxl
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ITERACOES = 600_000
SENHA_MIN = 10


def b64(b):
    return base64.b64encode(b).decode()


def norm(s):
    return unicodedata.normalize("NFC", str(s or "")).strip()


def chave_proc(s):
    return norm(s).lower()


def id_usuario(u):
    return hashlib.sha256(("painel-frotas:" + norm(u).lower()).encode()).hexdigest()


def cifrar(chave, dados, aad):
    iv = os.urandom(12)
    return {"iv": b64(iv), "ct": b64(AESGCM(chave).encrypt(iv, dados, aad.encode()))}


def ler_cadastros(caminho):
    ws = openpyxl.load_workbook(caminho, data_only=True).worksheets[0]
    linhas = [r for r in ws.iter_rows(values_only=True) if any(c not in (None, "") for c in r)]
    cab = [norm(c).upper() for c in linhas[0]]
    try:
        iu, ip, isn = cab.index("USUARIO"), cab.index("PROCESSO"), cab.index("SENHA")
    except ValueError:
        sys.exit("A planilha precisa das colunas USUARIO, PROCESSO e SENHA. Encontrei: %s" % cab)
    for n, r in enumerate(linhas[1:], start=2):
        yield n, norm(r[iu]), norm(r[ip]), norm(r[isn])


def recorte(D, procs):
    """Cópia dos dados só com os processos do grupo (procs=None: tudo)."""
    d = json.loads(json.dumps(D))
    d["escopo"] = "todos" if procs is None else sorted(procs)
    if procs is None:
        return d
    if "comportamento" in d:
        C = d["comportamento"]
        C["frotas"] = {f: v for f, v in C["frotas"].items() if chave_proc(v["processo"]) in procs}
        C["ev"] = [e for e in C["ev"] if e[2] in C["frotas"]]
        if not C["ev"]:
            d.pop("comportamento")
    if "motorOcioso" in d:
        d["motorOcioso"]["veiculos"] = [v for v in d["motorOcioso"]["veiculos"] if chave_proc(v["processo"]) in procs]
        if not d["motorOcioso"]["veiculos"]:
            d.pop("motorOcioso")
    if "conectividade" in d:
        K = d["conectividade"]
        K["frotas"] = {f: v for f, v in K["frotas"].items() if chave_proc(v["processo"]) in procs}
        K["hist"] = {f: h for f, h in K["hist"].items() if f in K["frotas"]}
        K["atual"] = {f: a for f, a in K["atual"].items() if f in K["frotas"]}
        K["pendencias"] = [p for p in K["pendencias"] if p["f"] in K["frotas"]]
        if not K["frotas"]:
            d.pop("conectividade")
    if "permanencia" in d:
        P = d["permanencia"]
        P["veiculos"] = {f: v for f, v in P["veiculos"].items() if chave_proc(v["processo"]) in procs}
        P["eventos"] = [e for e in P["eventos"] if e[0] in P["veiculos"]]
        if not P["eventos"]:
            d.pop("permanencia")
    if "cameras" in d:
        M = d["cameras"]
        M["proc"] = {p: r for p, r in M["proc"].items() if chave_proc(p) in procs}
        M["lista"] = [x for x in M["lista"] if chave_proc(x["processo"]) in procs]
        if not M["proc"]:
            d.pop("cameras")
    return d


def unificar_processos(D):
    """Aplica o de-para de ferramentas/processos.json em todas as abas."""
    caminho = os.path.join(os.path.dirname(os.path.abspath(__file__)), "processos.json")
    if not os.path.exists(caminho):
        return
    mapa = {chave_proc(k): v for k, v in json.load(open(caminho, encoding="utf-8")).items() if not k.startswith("_")}
    def troca(x):
        if isinstance(x, dict) and "processo" in x:
            x["processo"] = mapa.get(chave_proc(x["processo"]), x["processo"])
    for v in D.get("comportamento", {}).get("frotas", {}).values(): troca(v)
    for v in D.get("motorOcioso", {}).get("veiculos", []): troca(v)
    for v in D.get("permanencia", {}).get("veiculos", {}).values(): troca(v)
    for v in D.get("conectividade", {}).get("frotas", {}).values(): troca(v)
    if "cameras" in D:
        M = D["cameras"]
        for v in M["lista"]: troca(v)
        tot = {}
        for p, r in M["proc"].items():
            p2 = mapa.get(chave_proc(p), p)
            t = tot.setdefault(p2, {"n": 0, "st": {}, "gps": {}, "tk": 0, "ev": 0})
            for k in ("n", "tk", "ev"):
                t[k] += r[k]
            for k in ("st", "gps"):
                for s2, n in r[k].items():
                    t[k][s2] = t[k].get(s2, 0) + n
        M["proc"] = tot


def processos_informados():
    caminho = os.path.join(os.path.dirname(os.path.abspath(__file__)), "processos_frotas.json")
    if not os.path.exists(caminho):
        return {}
    return {norm(k): norm(v) for k, v in json.load(open(caminho, encoding="utf-8")).items() if not k.startswith("_")}


def aplicar_processos_informados(D):
    """Processo informado pelo usuário (ferramentas/processos_frotas.json) vale em todas as abas."""
    pi = processos_informados()
    if not pi:
        return
    for f, v in D.get("comportamento", {}).get("frotas", {}).items():
        if f in pi: v["processo"] = pi[f]
    for f, v in D.get("permanencia", {}).get("veiculos", {}).items():
        if f in pi: v["processo"] = pi[f]
    for f, v in D.get("conectividade", {}).get("frotas", {}).items():
        if f in pi: v["processo"] = pi[f]
    for v in D.get("motorOcioso", {}).get("veiculos", []):
        if v["id"] in pi: v["processo"] = pi[v["id"]]
    for x in D.get("cameras", {}).get("lista", []):
        if x["f"] in pi: x["processo"] = pi[x["f"]]


def completar_processos(D):
    """Frota sem processo numa aba e com processo em outra: usa o processo da outra aba.
    Com mais de um processo nas outras abas, vale o que aparece em mais abas; empate segue a ordem
    Conectividade, Comportamental, Motor ocioso, Permanência, Câmeras. Devolve {frota: processo} preenchidos."""
    vazio = lambda p: not norm(p) or chave_proc(p) == chave_proc("SEM PROCESSO")
    regs = []  # (aba, frota, registro)
    for f, v in D.get("conectividade", {}).get("frotas", {}).items(): regs.append((0, f, v))
    for f, v in D.get("comportamento", {}).get("frotas", {}).items(): regs.append((1, f, v))
    for v in D.get("motorOcioso", {}).get("veiculos", []): regs.append((2, v["id"], v))
    for f, v in D.get("permanencia", {}).get("veiculos", {}).items(): regs.append((3, f, v))
    for x in D.get("cameras", {}).get("lista", []): regs.append((4, x["f"], x))
    cand = {}
    for aba, f, v in regs:
        if not vazio(v.get("processo")):
            c = cand.setdefault(norm(f), {}).setdefault(v["processo"], [0, 9])
            c[0] += 1; c[1] = min(c[1], aba)
    feitos = {}
    for aba, f, v in regs:
        if aba == 4 or not vazio(v.get("processo")) or norm(f) not in cand:
            continue  # Câmeras só servem de fonte (os totais por processo já vêm prontos)
        p = sorted(cand[norm(f)].items(), key=lambda kv: (-kv[1][0], kv[1][1]))[0][0]
        v["processo"] = p; feitos[norm(f)] = p
    return feitos


def remover_ocorrencias(D):
    """Tira do Comportamental as ocorrências de ferramentas/ocorrencias_excluidas.json."""
    caminho = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ocorrencias_excluidas.json")
    C = D.get("comportamento")
    if not os.path.exists(caminho) or not C:
        return 0
    import datetime
    ini = datetime.date.fromisoformat(C["inicio"])
    tipos = {t["id"]: i for i, t in enumerate(C["tipos"])}
    tirados = 0
    for o in json.load(open(caminho, encoding="utf-8")).get("ocorrencias", []):
        dia = (datetime.date.fromisoformat(o["data"]) - ini).days
        ti = tipos.get(o["tipo"])
        resta = o.get("qtd")
        for e in C["ev"]:
            if e[0] == dia and e[1] == ti and norm(e[2]) == norm(o["frota"]) and e[3] > 0:
                n = e[3] if resta is None else min(e[3], resta)
                e[3] -= n; tirados += n
                if resta is not None:
                    resta -= n
                    if resta <= 0: break
    C["ev"] = [e for e in C["ev"] if e[3] > 0]
    return tirados


def aplicar_de_para(D):
    """Junta na frota certa os registros que vieram pela placa (ferramentas/frotas_de_para.json)."""
    caminho = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frotas_de_para.json")
    if not os.path.exists(caminho):
        return
    dp = {norm(k).upper(): norm(v) for k, v in json.load(open(caminho, encoding="utf-8")).items() if not k.startswith("_")}
    nf = lambda f: dp.get(norm(f).upper(), f)
    def juntar_dict(d):  # mantém o registro da frota certa; o da placa só entra se ela não existir
        out = {}
        for f, v in d.items():
            if norm(f).upper() not in dp:
                out[f] = v
        for f, v in d.items():
            if norm(f).upper() in dp:
                out.setdefault(nf(f), v)
        return out
    if "comportamento" in D:
        C = D["comportamento"]
        C["frotas"] = juntar_dict(C["frotas"])
        soma = {}
        for e in C["ev"]:
            k = (e[0], e[1], nf(e[2])) + tuple(e[4:5]); soma[k] = soma.get(k, 0) + e[3]
        C["ev"] = sorted([list(k[:3]) + [n] + list(k[3:]) for k, n in soma.items()])
    if "permanencia" in D:
        P = D["permanencia"]
        P["veiculos"] = juntar_dict(P["veiculos"])
        for e in P["eventos"]:
            e[0] = nf(e[0])
    if "conectividade" in D:
        K = D["conectividade"]
        hist = {}
        for f, h in sorted(K["hist"].items(), key=lambda x: norm(x[0]).upper() in dp):  # frota certa primeiro
            g = nf(f)
            if g in hist:  # dia a dia, completa com o que só a placa tinha
                hist[g] = "".join(a if a != "." else b for a, b in zip(hist[g], h))
            else:
                hist[g] = h
        K["hist"] = hist
        K["frotas"] = juntar_dict(K["frotas"])
        K["atual"] = juntar_dict(K["atual"])
        for p in K.get("pendencias", []):
            p["f"] = nf(p["f"])
    if "motorOcioso" in D:
        M = D["motorOcioso"]
        por = {}
        for v in sorted(M["veiculos"], key=lambda v: norm(v["id"]).upper() in dp):
            g = nf(v["id"])
            if g in por:
                x = por[g]
                x["ligado"] = [round(a + b, 2) for a, b in zip(x["ligado"], v["ligado"])]
                x["ocioso"] = [round(a + b, 2) for a, b in zip(x["ocioso"], v["ocioso"])]
                for c in ("dl", "do"):  # últimos 14 dias (Resumo)
                    if c in x and c in v:
                        x[c] = [round(a + b, 2) for a, b in zip(x[c], v[c])]
                x["dias"] += v["dias"]
            else:
                por[g] = dict(v, id=g)
        M["veiculos"] = sorted(por.values(), key=lambda v: v["id"])
    if "cameras" in D:
        for x in D["cameras"]["lista"]:
            x["f"] = nf(x["f"])


def remover_excluidas(D):
    """Tira de todas as abas as frotas de ferramentas/frotas_excluidas.json (inativas)."""
    caminho = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frotas_excluidas.json")
    if not os.path.exists(caminho):
        return
    fora = {norm(f).upper() for f in json.load(open(caminho, encoding="utf-8"))["frotas"]}
    sai = lambda f: norm(f).upper() in fora
    if "comportamento" in D:
        C = D["comportamento"]
        C["frotas"] = {f: v for f, v in C["frotas"].items() if not sai(f)}
        C["ev"] = [e for e in C["ev"] if not sai(e[2])]
    if "motorOcioso" in D:
        D["motorOcioso"]["veiculos"] = [v for v in D["motorOcioso"]["veiculos"] if not sai(v.get("id", ""))]
    if "permanencia" in D:
        P = D["permanencia"]
        P["veiculos"] = {f: v for f, v in P["veiculos"].items() if not sai(f)}
        P["eventos"] = [e for e in P["eventos"] if not sai(e[0])]
    if "conectividade" in D:
        K = D["conectividade"]
        for k in ("frotas", "hist", "atual"):
            K[k] = {f: v for f, v in K[k].items() if not sai(f)}
        K["pendencias"] = [p for p in K.get("pendencias", []) if not sai(p["f"])]
    if "cameras" in D:
        D["cameras"]["lista"] = [x for x in D["cameras"]["lista"] if not sai(x["f"])]


def remover_locais(D):
    """Tira das permanências os locais de ferramentas/locais_excluidos.json."""
    caminho = os.path.join(os.path.dirname(os.path.abspath(__file__)), "locais_excluidos.json")
    if not os.path.exists(caminho) or "permanencia" not in D:
        return
    fora = {norm(n).lower() for n in json.load(open(caminho, encoding="utf-8"))["locais"]}
    P = D["permanencia"]
    ix = {i for i, l in enumerate(P["locais"]) if norm(l["nome"]).lower() in fora}
    P["eventos"] = [e for e in P["eventos"] if e[4] not in ix]


def main(cad, fonte, saida):
    D = json.load(open(fonte, encoding="utf-8"))
    unificar_processos(D)
    aplicar_de_para(D)
    aplicar_processos_informados(D)
    feitos = completar_processos(D)
    if feitos:
        print("%d frota(s) sem processo completadas pelo processo de outra aba" % len(feitos))
    remover_excluidas(D)
    remover_locais(D)
    tiradas = remover_ocorrencias(D)
    if tiradas:
        print("%d ocorrência(s) do Comportamental desconsiderada(s)" % tiradas)
    conhecidos = {chave_proc(v["processo"]): v["processo"] for v in D.get("comportamento", {}).get("frotas", {}).values()}
    conhecidos.update({chave_proc(v["processo"]): v["processo"] for v in D.get("motorOcioso", {}).get("veiculos", [])})
    conhecidos.update({chave_proc(v["processo"]): v["processo"] for v in D.get("permanencia", {}).get("veiculos", {}).values()})
    conhecidos.update({chave_proc(v["processo"]): v["processo"] for v in D.get("conectividade", {}).get("frotas", {}).values()})
    conhecidos.update({chave_proc(p): p for p in D.get("cameras", {}).get("proc", {})})
    grupos, usuarios, avisos = {}, {}, []

    for n, u, p, s in ler_cadastros(cad):
        if not u:
            continue
        if not s:
            avisos.append("linha %d (%s): sem senha, ignorado" % (n, u)); continue
        if len(s) < SENHA_MIN:
            avisos.append("linha %d (%s): senha com menos de %d caracteres, ignorado" % (n, u, SENHA_MIN)); continue
        if not p:
            avisos.append("linha %d (%s): sem processo, ignorado" % (n, u)); continue
        if chave_proc(p) == "todos":
            procs = None
        else:
            procs = frozenset(chave_proc(x) for x in p.split(";") if norm(x))
            fora = [x for x in procs if x not in conhecidos]
            if fora:
                avisos.append("linha %d (%s): processo não encontrado nos dados: %s" % (n, u, ", ".join(fora)))
            procs = frozenset(x for x in procs if x in conhecidos)
            if not procs:
                continue
        gid = "todos" if procs is None else hashlib.sha256("|".join(sorted(procs)).encode()).hexdigest()[:16]
        if gid not in grupos:
            grupos[gid] = {"chave": AESGCM.generate_key(256), "procs": procs}
        uid = id_usuario(u)
        if uid in usuarios:
            avisos.append("linha %d (%s): usuário repetido, mantido o primeiro" % (n, u)); continue
        sal = os.urandom(16)
        kek = hashlib.pbkdf2_hmac("sha256", s.encode(), sal, ITERACOES, 32)
        usuarios[uid] = {"g": gid, "sal": b64(sal), **cifrar(kek, grupos[gid]["chave"], "chave:" + uid)}

    pacote = {
        "v": 1, "iter": ITERACOES, "gerado": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "usuarios": usuarios,
        "grupos": {gid: cifrar(g["chave"], json.dumps(recorte(D, g["procs"]), ensure_ascii=False).encode(), "dados:" + gid)
                   for gid, g in grupos.items()},
    }
    with open(saida, "w", encoding="utf-8") as f:
        f.write("// Gerado por ferramentas/gerar_acesso.py. Não edite à mão.\n")
        f.write("window.ACESSO = " + json.dumps(pacote, separators=(",", ":")) + ";\n")
    # Muda a versão dos scripts no index.html para o navegador baixar os dados novos.
    idx = os.path.join(os.path.dirname(os.path.abspath(saida)), "index.html")
    if os.path.exists(idx):
        import re
        h = open(idx, encoding="utf-8").read()
        open(idx, "w", encoding="utf-8").write(re.sub(r"\?v=\d{12}", "?v=" + datetime.now().strftime("%Y%m%d%H%M"), h))
    print("%d usuário(s), %d grupo(s) -> %s" % (len(usuarios), len(grupos), saida))
    for a in avisos:
        print("AVISO:", a)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
