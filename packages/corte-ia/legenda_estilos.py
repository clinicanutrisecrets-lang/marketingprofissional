# -*- coding: utf-8 -*-
"""Os estilos de legenda que a nutri escolhe.

Pedido da Aline (21/09/2026): "não sei se tem algumas opções de fontes das
legendas". Até aqui era uma só, escrita no código.

🔴 `classica` É O QUE JÁ ESTAVA NO AR, byte a byte. Ela é o default e o
fallback de nome desconhecido — quem não escolher nada recebe exatamente o
vídeo de antes. `tests`/`test_estilos.py` trava isso: estilo novo pode entrar,
mas não pode mudar o que a `classica` produz.

As fontes são as duas que o projeto já carrega (Inter e Fraunces, do
reel-engine). Não há fonte nova no repositório: cada arquivo novo é peso no
worker e mais uma licença pra conferir, e a variação que muda mesmo a cara da
legenda é PESO + CAIXA + COR, não a família.
"""

AMBER = "&H0B9EF5&"
TIFF = "&HA8B80B&"
WHITE = "&HFFFFFF&"

# rot = alternância de layout por frase. "big" é a legenda grande embaixo;
# "pill_band" e "pill_top" são a pílula arredondada, embaixo e no alto.
ESTILOS = {
    "classica": {
        "rotulo": "Clássica",
        "descricao": "Letra grossa em caixa alta, palavra falada em âmbar. É a do Scanner.",
        "fonte_cap": "InterBold",
        "fonte_pill": "InterBold",
        "fonte_pill_destaque": "InterBlack",
        "fonte_capa": "InterBlack",
        "fonte_apoio": "Fraunces",
        "destaque": AMBER,
        "caixa_alta": True,
        "italico_destaque": True,
        "rot": ["big", "pill_band", "big", "pill_top", "big", "pill_band", "big"],
        "fs_cap": 92,
        "fs_pill": 56,
    },
    "editorial": {
        "rotulo": "Editorial",
        "descricao": "Serifada, caixa mista, palavra falada em Tiffany. Mais calma, combina com conteúdo científico.",
        "fonte_cap": "FrauncesBold",
        "fonte_pill": "FrauncesBold",
        "fonte_pill_destaque": "FrauncesBold",
        "fonte_capa": "FrauncesBold",
        "fonte_apoio": "Fraunces",
        "destaque": TIFF,
        "caixa_alta": False,
        "italico_destaque": False,
        "rot": ["big", "pill_band", "big", "pill_top", "big", "pill_band", "big"],
        "fs_cap": 84,
        "fs_pill": 54,
    },
    "impacto": {
        "rotulo": "Impacto",
        "descricao": "Tudo em bloco, sem pílula, palavra falada em Tiffany. Pra vídeo curto e direto.",
        "fonte_cap": "InterBlack",
        "fonte_pill": "InterBlack",
        "fonte_pill_destaque": "InterBlack",
        "fonte_capa": "InterBlack",
        "fonte_apoio": "Fraunces",
        "destaque": TIFF,
        "caixa_alta": True,
        "italico_destaque": False,
        "rot": ["big"],
        "fs_cap": 100,
        "fs_pill": 60,
    },
}

PADRAO = "classica"


def por_nome(nome):
    """Nome desconhecido, vazio ou None → a clássica. Nunca levanta erro:
    legenda errada é ruim, vídeo que não sai é pior."""
    return ESTILOS.get((nome or "").strip().lower(), ESTILOS[PADRAO])


def nomes():
    return list(ESTILOS)


def para_tela():
    """O que a tela da nutri mostra em cada opção."""
    return [{"id": k, "rotulo": v["rotulo"], "descricao": v["descricao"]}
            for k, v in ESTILOS.items()]
