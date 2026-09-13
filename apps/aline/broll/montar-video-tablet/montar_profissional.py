# Versao para nutricionista, montada no mesmo tablet.
# A tela da correlacao aparece duas vezes: no comeco parada no topo, pra
# firmar a tese, e no meio rolando pelos tres casos.
from montar_tablet import passo

ROTEIRO = [
    ("correlacao-wide",        0.0,  5.0, 0.0,   0),
    ("scanner-genetica-wide",  5.0, 13.0, 0.6, 120),
    ("scanner-exames-wide",   13.0, 21.0, 0.6,  32),
    ("questionario-wide",     21.0, 28.5, 0.6,  21),
    ("correlacao-wide",       28.5, 44.0, 0.8,  74),
    ("prato-nutrigenomico",   44.0, 51.0, 0.0,   0),
    ("trilha-wide",           51.0, 59.0, 0.0,   0),
]

if __name__ == "__main__":
    passo("base-tablet.mp4", "prof-p1.mp4", ROTEIRO[:4])
    passo("prof-p1.mp4",     "prof-p2.mp4", ROTEIRO[4:])
    print("pronto: prof-p2.mp4")
