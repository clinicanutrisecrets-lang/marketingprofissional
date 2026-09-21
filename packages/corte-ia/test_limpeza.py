# -*- coding: utf-8 -*-
"""python3 -m unittest discover -s packages/corte-ia -p 'test_*.py'"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import limpeza as L  # noqa: E402


def fala(pares, texto=""):
    """pares = [(palavra, inicio, fim)] → um segmento de transcrição."""
    palavras = [{"t": t, "i": i, "f": f} for t, i, f in pares]
    return [{"inicio": palavras[0]["i"], "fim": palavras[-1]["f"],
             "texto": texto or " ".join(p["t"] for p in palavras),
             "palavras": palavras}]


def corrido(palavras, inicio=0.0, passo=0.4):
    """Fala sem pausa nenhuma, pra montar caso base."""
    t, fora = inicio, []
    for p in palavras:
        fora.append((p, round(t, 2), round(t + passo - 0.05, 2)))
        t += passo
    return fora


def tudo_silencio(*intervalos):
    """Atalho: o áudio confirma exatamente estes trechos como silêncio."""
    return list(intervalos)


class Silencio(unittest.TestCase):
    def test_pausa_longa_no_meio_vira_corte(self):
        tr = fala([("o", 1.0, 1.2), ("corpo", 1.2, 1.7),
                   ("inflama", 5.0, 5.6), ("sempre", 5.6, 6.0)])
        r = L.planejar_limpeza(tr, 7.0, tudo_silencio((0.0, 1.0), (1.7, 5.0), (6.0, 7.0)))
        pausas = [t for t in r["removidos"] if t["tipo"] == L.SILENCIO]
        self.assertEqual(len(pausas), 1)
        # o corte fica DENTRO do silêncio, com respiro dos dois lados
        self.assertGreater(pausas[0]["inicio"], 1.7)
        self.assertLess(pausas[0]["fim"], 5.0)
        self.assertLess(r["dur_final"], r["dur_original"])

    def test_pausa_curta_nao_e_tocada(self):
        tr = fala([("a", 0.2, 0.4), ("fibra", 0.9, 1.4), ("alimenta", 1.5, 2.2)])
        r = L.planejar_limpeza(tr, 2.5, tudo_silencio((0.4, 0.9)))
        self.assertEqual(r["removidos"], [])
        self.assertEqual(r["manter"], [(0.0, 2.5)])

    def test_respiro_impede_corte_de_encostar_na_palavra(self):
        tr = fala([("um", 0.1, 0.4), ("dois", 3.0, 3.4)])
        r = L.planejar_limpeza(tr, 4.0, tudo_silencio((0.4, 3.0)))
        t = [x for x in r["removidos"] if x["tipo"] == L.SILENCIO][0]
        self.assertAlmostEqual(t["inicio"], 0.4 + L.RESPIRO, places=2)
        self.assertAlmostEqual(t["fim"], 3.0 - L.RESPIRO, places=2)

    def test_cabeca_e_rabo(self):
        tr = fala(corrido(["oi", "gente", "olha", "isso", "aqui"], 4.0))
        r = L.planejar_limpeza(tr, 12.0, tudo_silencio((0.0, 4.0), (5.95, 12.0)))
        motivos = {t["motivo"] for t in r["removidos"]}
        self.assertIn("silêncio do começo", motivos)
        self.assertIn("silêncio do fim", motivos)
        # sobra o respiro configurado, não zero
        self.assertAlmostEqual(r["manter"][0][0], 4.0 - L.CABECA_MAX, places=2)


class AudioConfirma(unittest.TestCase):
    """A trava principal: buraco na transcrição não é prova de silêncio."""

    def test_buraco_que_o_audio_diz_ser_fala_nao_e_cortado(self):
        # whisper perdeu 3 s de fala no meio. Se cortar, come a frase da nutri.
        tr = fala([("o", 1.0, 1.2), ("corpo", 1.2, 1.7),
                   ("inflama", 5.0, 5.6), ("sempre", 5.6, 6.0)])
        r = L.planejar_limpeza(tr, 7.0, tudo_silencio((6.2, 7.0)))
        self.assertFalse([t for t in r["removidos"] if t["tipo"] == L.SILENCIO])

    def test_corta_so_o_pedaco_que_o_audio_confirma(self):
        # buraco de 1,0 a 5,0; o áudio só confirma silêncio de 2,0 a 4,0
        tr = fala([("um", 0.5, 1.0), ("dois", 5.0, 5.5)])
        r = L.planejar_limpeza(tr, 6.0, tudo_silencio((2.0, 4.0)))
        pausas = [t for t in r["removidos"] if t["tipo"] == L.SILENCIO]
        self.assertEqual(len(pausas), 1)
        self.assertAlmostEqual(pausas[0]["inicio"], 2.0, places=2)
        self.assertAlmostEqual(pausas[0]["fim"], 4.0, places=2)

    def test_sem_audio_o_limiar_e_mais_alto(self):
        # 0,9 s de buraco: com áudio vira corte, sem áudio não
        tr = fala([("um", 0.2, 0.6), ("dois", 1.5, 2.0), ("tres", 2.0, 2.5)])
        com = L.planejar_limpeza(tr, 3.0, tudo_silencio((0.6, 1.5)))
        sem = L.planejar_limpeza(tr, 3.0, None)
        self.assertTrue(com["removidos"])
        self.assertEqual(sem["removidos"], [])
        self.assertTrue(com["audio_confirmou"])
        self.assertFalse(sem["audio_confirmou"])


class FalsaPartida(unittest.TestCase):
    def test_recomeco_com_pausa_remove_a_primeira_tomada(self):
        pares = corrido(["o", "que", "acontece", "e"], 0.0)
        pares += corrido(["o", "que", "acontece", "e", "que", "o", "corpo", "inflama"], 2.4)
        tr = fala(pares)
        r = L.planejar_limpeza(tr, 6.5, tudo_silencio((1.55, 2.4), (5.55, 6.5)))
        self.assertTrue(any(t["tipo"] == L.RECOMECO for t in r["removidos"]))
        nova = L.remapear_transcricao(tr, r["manter"])
        texto = " ".join(p["t"] for s in nova for p in s["palavras"])
        self.assertEqual(texto.count("acontece"), 1)
        self.assertIn("inflama", texto)

    def test_repeticao_de_enfase_sem_pausa_fica(self):
        # "nao e sorte nao e sorte" dito de corrido é escrita, não erro
        pares = corrido(["nao", "e", "sorte", "nao", "e", "sorte", "e", "genetica"])
        r = L.planejar_limpeza(fala(pares), 3.5, tudo_silencio((3.15, 3.5)))
        self.assertFalse(any(t["tipo"] == L.RECOMECO for t in r["removidos"]))

    def test_repeticao_longe_demais_nao_conta(self):
        pares = corrido(["o", "corpo", "inflama"], 0.0)
        pares += corrido(["o", "corpo", "inflama"], 20.0)
        r = L.planejar_limpeza(fala(pares), 25.0, tudo_silencio((1.15, 20.0), (21.15, 25.0)))
        self.assertFalse(any(t["tipo"] == L.RECOMECO for t in r["removidos"]))


class Hesitacao(unittest.TestCase):
    def test_hum_isolado_sai(self):
        pares = [("entao", 0.1, 0.5), ("hum", 1.2, 1.6)]
        pares += corrido(["a", "fibra", "alimenta", "a", "microbiota"], 2.4)
        tr = fala(pares)
        r = L.planejar_limpeza(tr, 4.6, tudo_silencio((0.5, 1.2), (1.6, 2.4), (4.35, 4.6)))
        nova = L.remapear_transcricao(tr, r["manter"])
        texto = " ".join(p["t"] for s in nova for p in s["palavras"])
        self.assertNotIn("hum", texto)
        self.assertIn("fibra", texto)

    def test_palavra_legitima_parecida_nao_sai(self):
        # "um" no meio da frase, sem pausa, é numeral e fica
        pares = corrido(["tem", "um", "gene", "que", "muda", "isso"])
        r = L.planejar_limpeza(fala(pares), 3.0, tudo_silencio((2.35, 3.0)))
        self.assertFalse(any(t["tipo"] == L.HESITA for t in r["removidos"]))

    def test_artigo_isolado_depois_de_pausa_nao_e_hesitacao(self):
        """Regressão: "a" e "e" já estiveram na lista de muletas e o corte
        comia o "a" de "a microbiota toda" quando ele vinha depois de pausa."""
        pares = corrido(["a", "fibra", "alimenta"], 0.0)
        pares += corrido(["a", "microbiota", "toda"], 5.0)
        tr = fala(pares)
        r = L.planejar_limpeza(tr, 8.0, tudo_silencio((1.15, 5.0), (6.15, 8.0)))
        self.assertFalse(any(t["tipo"] == L.HESITA for t in r["removidos"]))
        texto = " ".join(p["t"] for s in L.remapear_transcricao(tr, r["manter"])
                         for p in s["palavras"])
        self.assertIn("a microbiota toda", texto)


class Travas(unittest.TestCase):
    def test_palavra_removida_sai_inteira_nunca_pela_metade(self):
        """Regressão: o respiro era aplicado às cegas no intervalo já montado.
        Com a muleta colada na palavra seguinte (folga de 0,02 s), o corte
        terminava DENTRO do 'hum' e sobrava meio fonema no áudio."""
        # 0,27 s de folga antes e 0,02 s depois: a muleta está colada na
        # palavra seguinte, e o buraco todo (0,69 s) não chega a virar pausa,
        # então não há corte de silêncio pra cobrir o erro.
        pares = [("olha", 0.10, 0.60), ("hum", 0.87, 1.27)]
        pares += corrido(["a", "fibra", "alimenta", "a", "microbiota"], 1.29)
        tr = fala(pares)
        r = L.planejar_limpeza(tr, 3.5, tudo_silencio((0.6, 0.87), (3.24, 3.5)))
        cortes = [t for t in r["removidos"] if t["tipo"] == L.HESITA]
        self.assertTrue(cortes, "o 'hum' isolado deveria sair")
        self.assertTrue(any(t["inicio"] <= 0.87 and t["fim"] >= 1.27 for t in cortes),
                        f"o corte {cortes} partiu a palavra ao meio")


    def test_transcricao_pobre_em_video_longo_nao_e_cortada(self):
        # 3 palavras em 60 s e o áudio sem silêncio medido: é o caso em que o
        # reconhecimento falhou, não a gravação
        tr = fala([("um", 1.0, 1.3), ("dois", 25.0, 25.4), ("tres", 55.0, 55.4)])
        r = L.planejar_limpeza(tr, 60.0, None)
        self.assertEqual(r["removidos"], [])
        self.assertEqual(r["manter"], [(0.0, 60.0)])
        self.assertIn("deixei a gravação inteira", r["aviso"].lower())

    def test_teto_de_fala_removida(self):
        # vídeo que é quase só repetição: não dá pra ter certeza do que é erro
        pares = []
        t = 0.0
        for _ in range(6):
            pares += corrido(["o", "corpo", "inflama"], t)
            t += 1.6
        r = L.planejar_limpeza(fala(pares), t + 1.0, tudo_silencio((t - 0.2, t + 1.0)))
        self.assertEqual(r["removidos"], [])
        self.assertIn("repetição demais", r["aviso"])

    def test_primeira_e_ultima_palavra_sobrevivem(self):
        tr = fala([("hum", 0.5, 0.9), ("entao", 2.0, 2.5), ("olha", 4.0, 4.5), ("hum", 6.0, 6.4)])
        r = L.planejar_limpeza(tr, 7.0, tudo_silencio((0.0, 0.5), (0.9, 2.0), (2.5, 4.0), (4.5, 6.0), (6.4, 7.0)))
        nova = L.remapear_transcricao(tr, r["manter"])
        palavras = [p["t"] for s in nova for p in s["palavras"]]
        self.assertEqual(palavras[0], "hum")
        self.assertEqual(palavras[-1], "hum")

    def test_sem_timestamp_nao_faz_nada(self):
        r = L.planejar_limpeza([{"inicio": 0, "fim": 5, "texto": "oi", "palavras": []}], 5.0, [])
        self.assertEqual(r["manter"], [(0.0, 5.0)])
        self.assertIn("sem timestamp", r["aviso"])

    def test_desligado_devolve_o_video_inteiro(self):
        tr = fala([("um", 0.1, 0.4), ("dois", 9.0, 9.4)])
        r = L.planejar_limpeza(tr, 10.0, tudo_silencio((0.4, 9.0)), ligado=False)
        self.assertEqual(r["manter"], [(0.0, 10.0)])
        self.assertEqual(r["seg_removidos"], 0.0)

    def test_nenhum_corte_abaixo_do_minimo(self):
        tr = fala([("um", 0.1, 0.4), ("dois", 1.2, 1.6), ("tres", 2.6, 3.0)])
        r = L.planejar_limpeza(tr, 3.4, tudo_silencio((0.4, 1.2), (1.6, 2.6), (3.0, 3.4)))
        for t in r["removidos"]:
            self.assertGreaterEqual(t["fim"] - t["inicio"], L.MIN_CORTE)

    def test_corte_nunca_cai_dentro_de_palavra(self):
        pares = corrido(["a", "fibra", "alimenta"], 0.0)
        pares += corrido(["a", "microbiota", "toda"], 5.0)
        tr = fala(pares)
        r = L.planejar_limpeza(tr, 8.0, tudo_silencio((1.15, 5.0), (6.15, 8.0)))
        for t in r["removidos"]:
            for p in L.palavras_de(tr):
                # nenhum instante de palavra pode estar dentro de um corte
                self.assertFalse(t["inicio"] < p["i"] < t["fim"] or t["inicio"] < p["f"] < t["fim"],
                                 f"corte {t} invade a palavra {p}")


class Remapeamento(unittest.TestCase):
    def test_tempo_anda_pra_tras_na_medida_do_corte(self):
        manter = [(0.0, 2.0), (5.0, 8.0)]
        self.assertEqual(L.remapear_tempo(1.0, manter), 1.0)
        self.assertEqual(L.remapear_tempo(5.0, manter), 2.0)
        self.assertEqual(L.remapear_tempo(6.5, manter), 3.5)

    def test_instante_removido_cai_na_emenda(self):
        manter = [(0.0, 2.0), (5.0, 8.0)]
        self.assertEqual(L.remapear_tempo(3.5, manter), 2.0)

    def test_transcricao_remapeada_nao_tem_buraco(self):
        tr = fala([("a", 0.1, 0.5), ("b", 6.0, 6.4), ("c", 6.4, 6.9)])
        r = L.planejar_limpeza(tr, 7.5, tudo_silencio((0.5, 6.0), (6.9, 7.5)))
        nova = L.remapear_transcricao(tr, r["manter"])
        tempos = [p["i"] for s in nova for p in s["palavras"]]
        self.assertEqual(len(tempos), 3)
        for a, b in zip(tempos, tempos[1:]):
            self.assertLessEqual(b - a, L.LIMIAR_SILENCIO + 2 * L.RESPIRO + 0.01)

    def test_duracao_final_bate_com_a_soma_do_que_ficou(self):
        tr = fala([("a", 1.0, 1.4), ("b", 5.0, 5.4), ("c", 9.0, 9.4)])
        r = L.planejar_limpeza(tr, 10.0, tudo_silencio((0.0, 1.0), (1.4, 5.0), (5.4, 9.0), (9.4, 10.0)))
        soma = sum(b - a for a, b in r["manter"])
        self.assertAlmostEqual(soma, r["dur_final"], places=1)


class Aviso(unittest.TestCase):
    def test_frase_tem_numero(self):
        tr = fala([("a", 1.0, 1.4), ("b", 5.0, 5.4)])
        r = L.planejar_limpeza(tr, 6.0, tudo_silencio((0.0, 1.0), (1.4, 5.0), (5.4, 6.0)))
        frase = L.frase_do_aviso(r)
        self.assertTrue(any(c.isdigit() for c in frase), frase)

    def test_nada_a_cortar(self):
        pares = corrido(["a", "b", "c"])
        r = L.planejar_limpeza(fala(pares), 1.3, [])
        self.assertIn("já estava limpa", L.frase_do_aviso(r))


if __name__ == "__main__":
    unittest.main()
