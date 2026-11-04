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
    d["ocorrencias"]["linhas"] = [l for l in d["ocorrencias"]["linhas"] if chave_proc(l["processo"]) in procs]
    if "motorOcioso" in d:
        d["motorOcioso"]["veiculos"] = [v for v in d["motorOcioso"]["veiculos"] if chave_proc(v["processo"]) in procs]
        if not d["motorOcioso"]["veiculos"]:
            d.pop("motorOcioso")
    eqs = d.get("equipamentos", [])
    if "permanencia" in d and eqs and all("processo" in e for e in eqs):
        ids = {e["id"] for e in eqs if chave_proc(e["processo"]) in procs}
        d["permanencia"]["estadias"] = [x for x in d["permanencia"]["estadias"] if x["equip"] in ids]
    else:
        # Permanência ainda sem processo por equipamento: só para quem vê todos.
        d.pop("permanencia", None)
    return d


def main(cad, fonte, saida):
    D = json.load(open(fonte, encoding="utf-8"))
    conhecidos = {chave_proc(l["processo"]): l["processo"] for l in D["ocorrencias"]["linhas"]}
    conhecidos.update({chave_proc(v["processo"]): v["processo"] for v in D.get("motorOcioso", {}).get("veiculos", [])})
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
    print("%d usuário(s), %d grupo(s) -> %s" % (len(usuarios), len(grupos), saida))
    for a in avisos:
        print("AVISO:", a)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
