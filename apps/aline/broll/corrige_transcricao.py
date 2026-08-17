#!/usr/bin/env python3
"""Conserta o vocabulário técnico que o reconhecimento de fala erra.

O Whisper não conhece nome de gene nem termo de bioquímica: ele escreve
"bife do bactéria" pra bifidobactéria, "FAD1" pra FADS1 e "Epidéaga" pra
EPA e DHA. Isso já foi pro ar duas vezes, então a correção deixa de ser
manual e passa a rodar sempre, na hora de montar o vídeo.

Duas listas:

- `TERMOS` é o dicionário do domínio — gene, nutriente, enzima. Palavra
  nova da marca entra aqui e vale pra todos os vídeos, inclusive os
  futuros.
- `HOMOFONOS` são os deslizes de português comum ("a veia" por "aveia")
  que só são erro nesse assunto.

Correção só de forma: o texto continua sendo o que ela falou.
"""

import json
import re
import sys
from pathlib import Path

# a chave é o que o reconhecimento costuma cuspir (comparada sem acento e
# sem caixa); o valor é como tem que sair na legenda
TERMOS = {
    # genes
    "inkk1": "ANKK1", "ank k1": "ANKK1", "ankk 1": "ANKK1",
    "fad1": "FADS1", "fads 1": "FADS1", "fad s1": "FADS1",
    "bcm1": "BCMO1", "bcmo 1": "BCMO1",
    "tas 2 r 38": "TAS2R38",
    "tcf 7 l 2": "TCF7L2",
    "apo e4": "APOE4", "apoe 4": "APOE4",
    "cyp 1 a 2": "CYP1A2",
    "m t h f r": "MTHFR",
    "comte": "COMT",
    "gad 1": "GAD1",
    "tph 2": "TPH2", "tp h2": "TPH2",
    "adora 2a": "ADORA2A",
    "ppar g": "PPAR gama", "pparg": "PPAR gama",
    "fut 2": "FUT2",
    "gstm1": "GSTM1", "gstm 1": "GSTM1", "g s t m 1": "GSTM1",
    "gpx1": "GPX1", "gpx 1": "GPX1", "g p x 1": "GPX1",
    "nrf2": "NRF2", "nrf 2": "NRF2", "n r f 2": "NRF2",
    "cyp2r1": "CYP2R1", "cyp 2 r 1": "CYP2R1",
    "glp 1 r": "GLP1R",
    "mc 4 r": "MC4R",
    "val 66 met": "Val66Met", "val66met": "Val66Met",
    # microbiota e bioquímica
    "bife do bactéria": "bifidobactéria",
    "bifi do bactéria": "bifidobactéria",
    "bifido bactéria": "bifidobactéria",
    "bifidobacterium": "bifidobactéria",
    "psicopiótica": "psicobiótica", "psico biótica": "psicobiótica",
    "psicopiótico": "psicobiótico",
    "epidéaga": "EPA e DHA", "epidiaga": "EPA e DHA",
    "epa e dha": "EPA e DHA",
    "beta glucana": "beta-glucana", "betaglucana": "beta-glucana",
    "beta caroteno": "betacaroteno",
    "l teanina": "L-teanina",
    "p 5 p": "P5P",
    "super taste": "supertaster", "super taster": "supertaster",
    "supertaste": "supertaster",
    "met met": "Met/Met",
    "sulfurafano": "sulforafano", "sulfora fano": "sulforafano",
    "glucorafanina": "glucorafanina", "gluco rafanina": "glucorafanina",
    "mirosinase": "mirosinase", "miro sinase": "mirosinase",
    "glutationa peroxidase": "glutationa peroxidase",
    "nutrigenetica": "nutrigenética",
    "nutrigenomica": "nutrigenômica",
}

# erro de separação/junção que só é erro nesse assunto: "a veia" existe
# em português, mas não numa receita de overnight oats
HOMOFONOS = {
    r"\bA veia\b": "A aveia",
    r"\ba veia\b": "a aveia",
    r"\bnão encamadas\b": "não em camadas",
    r"\bepiderminal\b": "abdominal",
    r"\bGEM não é\b": "Gene não é",
    r"\bgem não é\b": "gene não é",
    r"\bconverto de beta": "converte beta",
}

_SEM_ACENTO = str.maketrans("áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ",
                            "aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC")
_LETRA = re.compile(r"[0-9A-Za-zÀ-ÿ]")


def _chave(s):
    """Minúscula e sem acento, sem mudar o comprimento.

    O comprimento tem que bater porque a busca acontece na cópia
    normalizada e o recorte é aplicado no texto original.
    """
    return s.translate(_SEM_ACENTO).lower()


# do termo mais longo pro mais curto: senão "fad1" seria trocado dentro
# de "fads1" e o conserto viraria outro erro
_ORDEM = sorted(TERMOS, key=len, reverse=True)
_NORM = {e: _chave(e) for e in TERMOS}


def _isolado(norm, i, n):
    antes = norm[i - 1] if i else ""
    depois = norm[i + n] if i + n < len(norm) else ""
    return not (_LETRA.match(antes or " ") or _LETRA.match(depois or " "))


def corrige(txt):
    """Aplica o dicionário a uma frase, preservando o resto."""
    for padrao, troca in HOMOFONOS.items():
        txt = re.sub(padrao, troca, txt)
    norm = _chave(txt)
    saida, i = [], 0
    while i < len(txt):
        for errado in _ORDEM:
            alvo = _NORM[errado]
            n = len(alvo)
            if norm[i:i + n] == alvo and _isolado(norm, i, n):
                saida.append(TERMOS[errado])
                i += n
                break
        else:
            saida.append(txt[i])
            i += 1
    return "".join(saida)


def corrige_segs(segs):
    """Corrige `txt` e as palavras soltas, mantendo os tempos."""
    for s in segs:
        s["txt"] = corrige(s["txt"])
        for p in s.get("palavras", []):
            p["p"] = corrige(p["p"])
    return segs


def carrega(caminho):
    """Lê a transcrição já corrigida — é assim que o motor deve abrir."""
    return corrige_segs(json.loads(Path(caminho).read_text()))


if __name__ == "__main__":
    segs = carrega(sys.argv[1])
    if len(sys.argv) > 2:
        Path(sys.argv[2]).write_text(json.dumps(segs, ensure_ascii=False))
    for s in segs:
        print(f"[{s['ini']:6.2f}] {s['txt']}")
