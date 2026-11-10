"""Monta o bloco "permanencia" do dados-fonte.json a partir da base bruta de alertas
(pasta "COA - BASE DE DADOS MONITORAMENTO COMPORTAMENTAL", um CSV "Historico_Alertas_<dia>....csv" por dia).
Fonte da Permanência desde 10/11/2026. Usa só os eventos PERMANENCIA_CERCA e PERMANENCIA_PONTO.
Não leva motorista, CPF nem documento.

Uso:
    python permanencia_dos_csv.py <pasta-dos-csv> <dados-fonte.json> [--geral]

Incremental: os eventos lidos ficam guardados em permanencia_base.json (ao lado do dados-fonte.json,
na pasta local do usuário). Cada atualização lê só os CSVs novos ou alterados (pelo tamanho do
arquivo) e troca os dias deles; --geral relê todos os CSVs (só quando o usuário pedir).
A pasta pode ter só os CSVs novos (os outros dias continuam vindo da base): para economizar dados,
copie do computador só os arquivos cujo nome não está em permanencia_base.json ou cujo tamanho mudou.

Mesmas regras de permanencia_do_powerbi.py: sem ALARME FALSO, sem os pontos de "Liberação", cercas
com nome de pessoa viram "Colaborador X. Y.". Também ficam fora os alertas desconsiderados.
Eventos repetidos (mesma frota, tipo, data e hora, em arquivos repetidos do mesmo dia) contam uma vez.
O processo vem do que já está no dados-fonte.json (Permanência, Comportamental, Conectividade);
frota sem processo é completada depois pelo gerar_acesso.py.
"""
import csv, glob, io, json, os, re, sys

from permanencia_do_powerbi import montar

TIPOS = {"PERMANENCIA_CERCA", "PERMANENCIA_PONTO"}


def ler(caminho):
    raw = open(caminho, "rb").read()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            t = raw.decode(enc); break
        except UnicodeDecodeError:
            continue
    dl = ";" if t.split("\n", 1)[0].count(";") >= t.split("\n", 1)[0].count(",") else ","
    return csv.DictReader(io.StringIO(t), delimiter=dl)


def seg(s):
    p = [int(x) for x in re.findall(r"\d+", s or "")]
    return p[0] * 3600 + p[1] * 60 + p[2] if len(p) >= 3 else 0


def num(s):
    try:
        return float(str(s).replace(",", "."))
    except ValueError:
        return None


def main(pasta, destino, geral=False):
    D = json.load(open(destino, encoding="utf-8"))
    cache_c = os.path.join(os.path.dirname(os.path.abspath(destino)), "permanencia_base.json")
    cache = {"arquivos": {}, "dias": {}} if geral or not os.path.exists(cache_c) else json.load(open(cache_c, encoding="utf-8"))
    proc = {}
    for bloco, chave in (("conectividade", "frotas"), ("comportamento", "frotas"), ("permanencia", "veiculos")):
        for f, v in ((D.get(bloco) or {}).get(chave) or {}).items():
            if v.get("processo") and v["processo"].upper() not in ("SEM PROCESSO", ""):
                proc[f] = v["processo"]
    resp = {f: v.get("responsavel", "") for f, v in ((D.get("permanencia") or {}).get("veiculos") or {}).items()}
    novos_rows, vistos, arquivos, desc, dias_lidos = [], set(), 0, 0, set()
    for cam in sorted(glob.glob(os.path.join(pasta, "Historico_Alertas_*.csv"))):
        nome, st = os.path.basename(cam), os.stat(cam)
        assin = str(st.st_size)  # o tamanho; a data muda ao copiar o arquivo para outra máquina
        if cache["arquivos"].get(nome) == assin:
            continue
        cache["arquivos"][nome] = assin
        arquivos += 1
        m = re.search(r"Historico_Alertas_(\d{4}-\d{2}-\d{2})", nome)
        if m:
            dias_lidos.add(m.group(1))
        for r in ler(cam):
            tipo = (r.get("TIPO") or "").strip().upper()
            if tipo not in TIPOS:
                continue
            if (r.get("ALERTA DESCONSIDERADO") or "").strip().upper() == "SIM":
                desc += 1; continue
            f = (r.get("PREFIXO") or "").strip()
            dd, mm, aa = (r.get("DATA") or "").strip().split("/")
            d, h = "%s-%s-%s" % (aa, mm, dd), (r.get("HORA") or "").strip()[:5]
            k = (f, tipo, d, (r.get("HORA") or "").strip())
            if not f or k in vistos:
                continue
            vistos.add(k)
            dias_lidos.add(d)
            novos_rows.append({"f": f, "placa": (r.get("PLACA") or "").strip(), "proc": proc.get(f), "resp": resp.get(f, ""),
                         "ponto": r.get("PONTO_REFERENCIA"), "cerca": r.get("CERCA ELETRÔNICA"), "cat": r.get("CATEGORIA"),
                         "cid": r.get("CIDADE"), "rot": r.get("RÓTULO"), "lat": num(r.get("LATITUDE")), "lon": num(r.get("LONGITUDE")),
                         "dur": seg(r.get("DURACAO")), "d": d, "h": h})
    for d in dias_lidos:
        cache["dias"][d] = []
    for r in novos_rows:
        cache["dias"][r["d"]].append(r)
    json.dump(cache, open(cache_c, "w", encoding="utf-8"), ensure_ascii=False)
    print("%d arquivo(s) novo(s) ou alterado(s), %d eventos de permanência (cerca e ponto), %d desconsiderados" % (arquivos, len(novos_rows), desc))
    if not arquivos:
        print("nenhum CSV novo: remonta a partir da base guardada")
    rows = []
    for d in sorted(cache["dias"]):
        for r in cache["dias"][d]:
            r = dict(r); r["proc"] = proc.get(r["f"], r.get("proc")); r["resp"] = resp.get(r["f"], r.get("resp", ""))
            rows.append(r)
    montar(rows, destino, "Base bruta de alertas (Historico_Alertas), eventos de permanência em cerca e ponto")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--geral"]
    if len(args) != 2:
        sys.exit(__doc__)
    main(*args, geral="--geral" in sys.argv)
