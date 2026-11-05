"""Câmeras do painel: visualizador diário do relatório "Saúde do Veículo - Análise".

Uso:
    python cameras.py <Saude_do_Veiculo_-_Analise_....csv> <dados-fonte.json>

Lê o CSV exportado do sistema (separado por ";", acentos em Latin-1) e grava o bloco
"cameras" no dados-fonte.json, substituindo o do dia anterior (não guarda histórico).

Tipos de câmera (um quadro para cada um no painel):
- Motorista: MAL POSICIONADA, INTERMITENTE, NÃO FUNCIONANDO (colunas Sim/Não)
- Pista:     INTERMITENTE, NÃO FUNCIONANDO (Sim/Não)
- Auditoria: QTD INTERMITENTES, QTD NÃO FUNCIONANDO (quantidade de câmeras)

Entra na lista todo veículo com "Sim" (ou quantidade acima de zero) em alguma dessas colunas.
O processo vem do cadastro de frotas já presente no dados-fonte.json (pelo prefixo);
sem cadastro, usa a UO do relatório ("AROEIRA - TRANSPORTE" -> TRANSPORTE).
Horários do relatório estão em UTC e são convertidos para o horário de Brasília.
"""
import csv, json, os, re, sys, unicodedata
from datetime import datetime, timedelta

TIPOS = [
    ("motorista", "Câmera motorista", [
        ("CÂMERA MOTORISTA MAL POSICIONADA", "Mal posicionada"),
        ("CÂMERA MOTORISTA INTERMITENTE", "Intermitente"),
        ("CÂMERA MOTORISTA NÃO FUNCIONANDO", "Não funcionando"),
    ]),
    ("pista", "Câmera pista", [
        ("CÂMERA PISTA INTERMITENTE", "Intermitente"),
        ("CÂMERA PISTA NÃO FUNCIONANDO", "Não funcionando"),
    ]),
    ("auditoria", "Câmeras de auditoria", [
        ("QTD CÂMERAS DE AUDITORIA INTERMITENTES", "Intermitente"),
        ("QTD CÂMERAS DE AUDITORIA NÃO FUNCIONANDO", "Não funcionando"),
    ]),
]


def norm(s):
    return unicodedata.normalize("NFC", str(s or "")).strip()


def chave(s):
    return norm(s).upper()


def ler_csv(caminho):
    bruto = open(caminho, "rb").read()
    try:
        texto = bruto.decode("utf-8-sig")
    except UnicodeDecodeError:
        texto = bruto.decode("latin-1")
    linhas = list(csv.reader(texto.splitlines(), delimiter=";"))
    cab = [chave(c) for c in linhas[0]]
    for r in linhas[1:]:
        if any(c.strip() for c in r):
            yield {cab[i]: norm(r[i]) if i < len(r) else "" for i in range(len(cab))}


def hora_local(s):
    """'2026-11-04T17:29:11.347Z' (UTC) -> '2026-11-04 14:29' (Brasília). Vazio se não houver."""
    m = re.match(r"(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})", s or "")
    if not m:
        return ""
    dt = datetime.strptime(m.group(1) + " " + m.group(2) + ":" + m.group(3), "%Y-%m-%d %H:%M") - timedelta(hours=3)
    return dt.strftime("%Y-%m-%d %H:%M")


def momento_relatorio(caminho, linhas):
    """Hora do relatório: pelo nome do arquivo (o sistema grava a hora UTC nele) ou pelo dado mais recente."""
    m = re.search(r"(\d{4}-\d{2}-\d{2})T(\d{2})_(\d{2})", os.path.basename(caminho))
    if m:
        return hora_local("%sT%s:%s" % m.groups())
    datas = [hora_local(l.get(c, "")) for l in linhas for c in ("GSM TELEMETRIA", "ÚLTIMA VELOCIDADE")]
    return max([d for d in datas if d] or [datetime.now().strftime("%Y-%m-%d %H:%M")])


def cadastro_processos(D):
    """prefixo -> processo, a partir dos blocos que já têm o cadastro de frotas."""
    mapa = {}
    for v in D.get("motorOcioso", {}).get("veiculos", []):
        if v.get("id") and v.get("processo"):
            mapa[norm(v["id"])] = v["processo"]
    for bloco in ("permanencia", "comportamento", "conectividade"):
        frotas = D.get(bloco, {}).get("veiculos" if bloco == "permanencia" else "frotas", {})
        for f, v in frotas.items():
            if v.get("processo"):
                mapa[norm(f)] = v["processo"]
    return mapa


def defeito(valor):
    v = chave(valor)
    if v in ("SIM", "S"):
        return 1
    try:
        return int(float(v.replace(",", ".")))
    except ValueError:
        return 0


def main(arq, fonte):
    D = json.load(open(fonte, encoding="utf-8"))
    linhas = list(ler_csv(arq))
    faltam = [c for _, _, cols in TIPOS for c, _ in cols if c not in linhas[0]] if linhas else ["(arquivo vazio)"]
    if faltam:
        sys.exit("Colunas não encontradas no relatório: %s" % ", ".join(faltam))
    proc = cadastro_processos(D)
    quando = momento_relatorio(arq, linhas)
    total, lista, sem_cadastro = {}, [], []

    for l in linhas:
        f = l.get("PREFIXO") or l.get("PLACA")
        if not f or f == "-":
            continue
        p = proc.get(f)
        if not p:
            uo = l.get("UO", "")
            p = uo.split(" - ", 1)[1] if " - " in uo else "SEM PROCESSO"
            sem_cadastro.append(f)
        total[p] = total.get(p, 0) + 1
        d = []
        for tid, _, cols in TIPOS:
            for col, nome in cols:
                n = defeito(l.get(col))
                if n:
                    d.append([tid, nome, n])
        if not d:
            continue
        t = l.get("TICKET", "")
        lista.append({
            "f": f, "placa": l.get("PLACA", ""), "processo": p,
            "sit": l.get("SITUAÇÃO", "").replace("-", ""), "st": l.get("STATUS", "").replace("N/A", ""),
            "cams": defeito(l.get("NÚMERO TOTAL DE CÂMERAS")),
            "foto": hora_local(l.get("ÚLTIMA FOTO")), "video": hora_local(l.get("ÚLTIMO VÍDEO")),
            "ticket": t if t.startswith("http") else "",
            "tst": l.get("STATUS DO TICKET", "").replace("-", ""),
            "d": d,
        })

    lista.sort(key=lambda x: (x["processo"], x["f"]))
    dbr = quando[8:10] + "/" + quando[5:7] + "/" + quando[:4]
    D["cameras"] = {
        "real": True,
        "periodo": "Relatório de câmeras de " + dbr + " às " + quando[11:],
        "dia": quando[:10], "hora": quando[11:],
        "tipos": [{"id": tid, "nome": nome, "defeitos": [n for _, n in cols]} for tid, nome, cols in TIPOS],
        "total": total,
        "lista": lista,
    }
    json.dump(D, open(fonte, "w", encoding="utf-8"), ensure_ascii=False)
    print("Câmeras de %s: %d veículos no relatório, %d com defeito." % (dbr + " " + quando[11:], sum(total.values()), len(lista)))
    if sem_cadastro:
        print("Sem cadastro de frota (processo pela UO): %d veículos, ex.: %s" % (len(sem_cadastro), ", ".join(sem_cadastro[:8])))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
