# -*- coding: utf-8 -*-
"""Variação publicitária: mesmo corpo clínico, gancho e fecho de captação."""
import copy
from spec_exemplo_menopausa import SPEC as BASE

SPEC = copy.deepcopy(BASE)
SPEC["tema"] = "Nutricionista"
SPEC["cenas"][0] = {
    "tipo":"hook","dur":5.2,
    "sub":"Você atende pacientes na menopausa?",
    "sub_size":58, "head_top":800,
}
SPEC["cenas"][-1] = {
    "tipo":"cta_anuncio","dur":8.0,
    "eyebrow":"aula gratuita para nutricionistas",
}
