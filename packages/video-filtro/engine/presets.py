# -*- coding: utf-8 -*-
"""Os filtros que a pessoa escolhe na hora de gravar.

Pedido da Aline (21/09/2026): "igual quando é o Instagram, que tem a opção ali
embaixo — um que só dá uma melhoradinha na pele, que daí serviria para homem e
mulher, e o outro que daí tem o filtro do olho do gatinho".

São dois, e a diferença entre eles é MAQUIAGEM, não intensidade:

  PELE      pele, cabelo e dentes. Nenhum traço desenhado no rosto. É o que
            serve pra qualquer pessoa, inclusive homem, porque não coloca nada
            que não estava lá: só limpa a textura e tira o peso do cabelo.
  ELEGANTE  o de cima MAIS batom vinho e delineador levantado (o olho de
            gatinho). É o dela, aprovado em 12-13/09/2026.

🔴 Os números do ELEGANTE não se mexem sem ela: cada um saiu de uma reprovação
(ver o quadro no README). O PELE é um recorte dele, não uma regulagem nova —
as mesmas quatro chaves de pele e cabelo, com a maquiagem zerada. Assim os dois
têm o MESMO tom de pele, e trocar de filtro não muda a cor da pessoa.
"""
from preset_elegante import ELEGANTE

# Só o que trata a imagem de quem está na frente da câmera. `forca_batom` e
# `forca_delineador` em 0 fazem `aplicar_quadro` pular os dois traços.
PELE = dict(
    cabelo_contraste=ELEGANTE["cabelo_contraste"],
    cabelo_profundidade=ELEGANTE["cabelo_profundidade"],
    limpeza=ELEGANTE["limpeza"],
    nitidez=ELEGANTE["nitidez"],
    forca_batom=0.0,
    cor_batom=ELEGANTE["cor_batom"],
    escurecer_batom=0.0,
    forca_delineador=0.0,
    levantar_delineador=ELEGANTE["levantar_delineador"],
    asa_delineador=ELEGANTE["asa_delineador"],
    subir_delineador=ELEGANTE["subir_delineador"],
    forca_dentes=ELEGANTE["forca_dentes"],
)

PRESETS = {"pele": PELE, "elegante": ELEGANTE, "completo": ELEGANTE}

# O que a tela mostra. "nenhum" não é um preset: é não passar pelo filtro.
ROTULOS = {
    "nenhum": "Sem filtro",
    "pele": "Pele (suaviza e ilumina)",
    "completo": "Completo (pele + batom + olho de gatinho)",
}


def por_nome(nome):
    """'nenhum' → None (não filtra). Nome desconhecido → None, nunca explode:
    filtro é enfeite, e derrubar o vídeo inteiro por causa dele é pior."""
    return PRESETS.get((nome or "").strip().lower())


def tem_maquiagem(nome):
    p = por_nome(nome)
    return bool(p) and (p.get("forca_batom", 0) > 0 or p.get("forca_delineador", 0) > 0)
