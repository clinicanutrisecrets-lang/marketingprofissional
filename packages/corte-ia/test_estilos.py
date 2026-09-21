# -*- coding: utf-8 -*-
"""Estilos de legenda — a trava é a clássica não mudar.

O arquivo `golden/classica.ass` foi gerado comparando o render NOVO com o
`git show HEAD:render.py` de antes desta mudança: os dois saíram byte a byte
iguais. Ele fica no repositório pra que qualquer mexida futura nos estilos
mostre na hora se o vídeo que já estava no ar mudou de cara.

python3 -m unittest discover -s packages/corte-ia -p 'test_*.py'
"""
import os
import sys
import unittest

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import legenda_estilos as E  # noqa: E402

CHAVES = {"rotulo", "descricao", "fonte_cap", "fonte_pill", "fonte_pill_destaque",
          "fonte_capa", "fonte_apoio", "destaque", "caixa_alta",
          "italico_destaque", "rot", "fs_cap", "fs_pill"}
LAYOUTS = {"big", "pill_band", "pill_top"}


class Catalogo(unittest.TestCase):
    def test_classica_e_o_padrao(self):
        self.assertEqual(E.PADRAO, "classica")
        self.assertIs(E.por_nome(None), E.ESTILOS["classica"])
        self.assertIs(E.por_nome(""), E.ESTILOS["classica"])
        self.assertIs(E.por_nome("  CLÁSSICA  "), E.ESTILOS["classica"])  # com acento não casa
        self.assertIs(E.por_nome("nao-existe"), E.ESTILOS["classica"])
        self.assertIs(E.por_nome("  Classica "), E.ESTILOS["classica"])

    def test_classica_mantem_os_valores_que_estavam_no_codigo(self):
        """Regressão: estes seis valores estavam escritos dentro do render."""
        c = E.ESTILOS["classica"]
        self.assertEqual(c["fonte_cap"], "InterBold")
        self.assertEqual(c["fs_cap"], 92)
        self.assertEqual(c["fonte_pill"], "InterBold")
        self.assertEqual(c["fonte_pill_destaque"], "InterBlack")
        self.assertEqual(c["fs_pill"], 56)
        self.assertEqual(c["destaque"], "&H0B9EF5&")
        self.assertTrue(c["caixa_alta"])
        self.assertTrue(c["italico_destaque"])
        self.assertEqual(c["rot"], ["big", "pill_band", "big", "pill_top",
                                    "big", "pill_band", "big"])

    def test_todo_estilo_esta_completo(self):
        """Estilo pela metade só apareceria na hora do render, no worker."""
        for nome, est in E.ESTILOS.items():
            self.assertEqual(set(est), CHAVES, f"estilo {nome}")
            self.assertTrue(est["rot"], nome)
            self.assertTrue(set(est["rot"]) <= LAYOUTS, f"{nome}: {est['rot']}")
            self.assertGreater(est["fs_cap"], 40, nome)
            self.assertTrue(est["destaque"].startswith("&H"), nome)

    def test_tela_lista_todos(self):
        ids = {o["id"] for o in E.para_tela()}
        self.assertEqual(ids, set(E.ESTILOS))
        for o in E.para_tela():
            self.assertTrue(o["rotulo"] and o["descricao"])


class Fonte(unittest.TestCase):
    """O render não pode voltar a ter os valores escritos no meio do código."""

    def setUp(self):
        with open(os.path.join(AQUI, "render.py"), encoding="utf-8") as f:
            self.src = f.read()

    def test_render_le_o_estilo_em_vez_de_fixar_a_fonte(self):
        self.assertNotIn("Style: Cap,InterBold,92", self.src)
        self.assertNotIn("Style: PillTxt,InterBold,56", self.src)
        self.assertIn("est['fonte_cap']", self.src)
        self.assertIn("est['fonte_pill']", self.src)

    def test_render_nao_fixa_mais_a_cor_de_destaque_na_legenda(self):
        self.assertNotIn("\\\\c{AMBER}\\\\i1\\\\fnInterBlack", self.src)
        self.assertIn("{destaque}", self.src)

    def test_fraunces_bold_e_gerado_com_queda(self):
        self.assertIn("FrauncesBold", self.src)
        self.assertIn("FrauncesBold indisponivel", self.src)


@unittest.skipUnless(
    __import__("importlib").util.find_spec("fontTools"),
    "fontTools não instalado (só o worker precisa dele)")
class Golden(unittest.TestCase):
    """O ASS da clássica tem que sair igual ao arquivo guardado."""

    def _ass(self, estilo):
        import render
        plano = {
            "capa": {"linha1": "BUTIRATO", "linha2": "o combustivel",
                     "apoio": "quem faz e a sua microbiota"},
            "secoes": [{"inicio": 0.0, "fim": 6.0, "palavra_chave": "FIBRA"},
                       {"inicio": 6.0, "fim": 12.0, "palavra_chave": "BUTIRATO"}],
            "broll": [], "correcoes": [{"de": "rosburia", "para": "Roseburia"}],
        }
        palavras, t = [], 0.3
        for w in ("a fibra que voce come alimenta a rosburia. ela devolve butirato "
                  "pro seu intestino. me chama no direct!").split():
            palavras.append({"t": w, "i": round(t, 2), "f": round(t + 0.33, 2)})
            t += 0.42
        layout = {"modo": "retrato", "cap_big_y": 1500, "cap_pill_band_y": 1560,
                  "cap_pill_top_y": 700, "key_y": 520, "tag_y": 1860, "band_y": 0}
        return render.montar_ass(plano, palavras, 12.0, layout, "@nutri",
                                 "Scanner da Saúde", lambda txt, s: len(txt) * s * 0.52,
                                 estilo)

    def test_classica_bate_com_o_golden(self):
        with open(os.path.join(AQUI, "golden", "classica.ass"), encoding="utf-8") as f:
            esperado = f.read()
        self.assertEqual(self._ass("classica"), esperado)
        self.assertEqual(self._ass(None), esperado, "o default tem que ser a clássica")
        self.assertEqual(self._ass("nao-existe"), esperado, "nome errado cai na clássica")

    def test_os_outros_estilos_mudam_mesmo(self):
        base = self._ass("classica")
        for nome in E.nomes():
            if nome == "classica":
                continue
            self.assertNotEqual(self._ass(nome), base, nome)

    def test_editorial_troca_fonte_e_tira_a_caixa_alta(self):
        ass = self._ass("editorial")
        self.assertIn("Style: Cap,FrauncesBold", ass)
        self.assertIn("fibra", ass)          # caixa mista
        self.assertNotIn("A FIBRA QUE VOCE", ass)

    def test_impacto_nao_usa_pilula(self):
        ass = self._ass("impacto")
        self.assertNotIn("Dialogue: 0,0:00:", ass.split("[Events]")[1].split("Pill,")[0]
                         if "Pill," in ass.split("[Events]")[1] else "")
        self.assertNotIn(",Pill,,", ass.split("[Events]")[1])


if __name__ == "__main__":
    unittest.main()
