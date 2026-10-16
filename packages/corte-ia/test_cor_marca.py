# -*- coding: utf-8 -*-
"""Cor da marca na legenda (Aline, 16/10/2026).

python3 -m unittest discover -s packages/corte-ia -p 'test_*.py'
"""
import os
import sys
import unittest

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import legenda_estilos as E  # noqa: E402


def hexa(cor_ass):
    b, g, r = cor_ass[2:4], cor_ass[4:6], cor_ass[6:8]
    return f"#{r}{g}{b}"


class CorDaMarca(unittest.TestCase):
    def test_principal_legivel_vence(self):
        self.assertEqual(hexa(E.cor_de_destaque("#0ABFBC", "#D946EF")), "#0ABFBC")

    def test_principal_clara_demais_cai_na_secundaria(self):
        # Fernanda: verde-água quase branco some ao lado das palavras brancas
        self.assertEqual(hexa(E.cor_de_destaque("#BCE7E6", "#B5A1D4")), "#B5A1D4")

    def test_principal_escura_cai_na_secundaria(self):
        # Gleryston: verde-escuro some no contorno preto; o dourado lê
        self.assertEqual(hexa(E.cor_de_destaque("#033d26", "#b87d14")), "#B87D14")

    def test_nenhuma_serve_clareia_a_principal(self):
        # Mariana: verde-escuro e amarelo quase branco; sai o verde dela clareado
        cor = E._rgb(hexa(E.cor_de_destaque("#38571A", "#FFE4A8")))
        self.assertTrue(E.legivel(cor))
        self.assertGreater(cor[1], cor[0])  # continua verde
        self.assertGreater(cor[1], cor[2])

    def test_sem_cor_ou_cor_neutra_nao_muda_nada(self):
        est = E.por_nome(None)
        self.assertIs(E.com_cor_da_marca(est, None, None), est)
        self.assertIs(E.com_cor_da_marca(est, "#222222", "#FAFAFA"), est)
        self.assertIs(E.com_cor_da_marca(est, "lixo", ""), est)

    def test_nao_mexe_no_estilo_original(self):
        est = E.por_nome("editorial")
        antes = dict(est)
        novo = E.com_cor_da_marca(est, "#0ABD60", None)
        self.assertEqual(est, antes)
        self.assertEqual(novo["destaque"], novo["acento"])
        self.assertEqual(hexa(novo["destaque"]), "#0ABD60")

    def test_render_e_pipeline_passam_a_cor(self):
        render = open(os.path.join(AQUI, "render.py"), encoding="utf-8").read()
        pipe = open(os.path.join(AQUI, "pipeline.py"), encoding="utf-8").read()
        self.assertIn("com_cor_da_marca", render)
        self.assertIn("cor_primaria_hex,cor_secundaria_hex", pipe)
        corpo = render[render.index("def montar_ass("):render.index("# ---------------------------------------------------------------- vídeo")]
        self.assertNotIn("{TIFF}", corpo)


if __name__ == "__main__":
    unittest.main()
