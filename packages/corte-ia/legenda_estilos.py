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


# ---------------------------------------------------------------- cor da marca
# Pedido da Aline (16/10/2026): a palavra falada sai na cor da marca da
# profissional, não no âmbar/Tiffany do Scanner. A cor precisa ser LIDA em
# cima do vídeo: a legenda grande tem contorno preto e a pílula é escura, então
# a cor tem que ser clara o bastante pra aparecer no escuro E diferente o
# bastante do branco das outras palavras (senão o destaque some).
# Ordem: principal → secundária → principal clareada → o estilo de sempre.
# Sem cor cadastrada, nada muda (o vídeo sai byte a byte como antes).

LUM_MIN = 0.18   # contraste ≥ 4,6 contra o preto do contorno
CONTRASTE_BRANCO_MIN = 1.45  # distância mínima do branco das outras palavras


def _rgb(hex_):
    h = (hex_ or "").strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        return None
    try:
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return None


def luminancia(rgb):
    def canal(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (canal(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def legivel(rgb):
    lum = luminancia(rgb)
    return lum >= LUM_MIN and (1.05 / (lum + 0.05)) >= CONTRASTE_BRANCO_MIN


def _saturada(rgb):
    return max(rgb) - min(rgb) >= 40  # cinza clareado vira branco, não cor


def _clarear(rgb):
    """Mistura com branco até ficar legível. None se nunca ficar (cor neutra)."""
    if not _saturada(rgb):
        return None
    for passo in range(1, 20):
        f = passo / 20
        c = tuple(round(x + (255 - x) * f) for x in rgb)
        if legivel(c):
            return c
        if luminancia(c) > 0.6:
            return None
    return None


def ass(rgb):
    r, g, b = rgb
    return f"&H{b:02X}{g:02X}{r:02X}&"


def cor_de_destaque(primaria, secundaria):
    """Devolve a cor (formato ASS) ou None quando nenhuma serve."""
    p, s = _rgb(primaria), _rgb(secundaria)
    for c in (p, s):
        if c and legivel(c):
            return ass(c)
    for c in (p, s):
        if c:
            clara = _clarear(c)
            if clara:
                return ass(clara)
    return None


def com_cor_da_marca(est, primaria=None, secundaria=None):
    """Cópia do estilo com a cor da marca no destaque e nos detalhes
    (capa, subtítulo, barra de progresso). Sem cor que sirva, o próprio estilo."""
    cor = cor_de_destaque(primaria, secundaria)
    if not cor:
        return est
    return dict(est, destaque=cor, acento=cor)
