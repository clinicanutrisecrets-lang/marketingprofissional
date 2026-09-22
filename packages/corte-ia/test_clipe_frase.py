# -*- coding: utf-8 -*-
"""Travas do vídeo curto (clipe da biblioteca + frase em cima).

Roda sem ffmpeg: só as funções puras.
  python3 -m pytest packages/corte-ia/test_clipe_frase.py
  python3 packages/corte-ia/test_clipe_frase.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import clipe_frase as cf  # noqa: E402


def medidor_falso(largura_por_char=48):
    """Medidor previsível: cada caractere ocupa `largura_por_char` no corpo 100."""
    return lambda txt, fs: len(txt) * largura_por_char * fs / 100.0


# ------------------------------------------------------------ frase
def test_frase_vazia_recusa_com_motivo():
    for entrada in ["", "   ", None, "\n\t "]:
        try:
            cf.normalizar_frase(entrada)
            raise AssertionError(f"{entrada!r} deveria ter sido recusada")
        except cf.FraseInvalida as e:
            assert "escreva a frase" in str(e)


def test_frase_longa_diz_quanto_passou():
    # Recusar sem dizer o tamanho faz ela cortar no chute.
    try:
        cf.normalizar_frase("a" * 200)
        raise AssertionError("deveria recusar")
    except cf.FraseInvalida as e:
        assert "200" in str(e) and str(cf.FRASE_MAX) in str(e)


def test_frase_no_limite_passa():
    assert cf.normalizar_frase("a" * cf.FRASE_MAX)


def test_espaco_sobrando_nao_conta_como_tamanho():
    assert cf.normalizar_frase("  o   seu   intestino  ") == "o seu intestino"


# ------------------------------------------------------------ duração
def test_nunca_passa_do_clipe():
    # Repetir ou congelar frame entrega vídeo travado; o teto é o clipe.
    assert cf.duracao_final(10, 6.0) == 6.0
    assert cf.duracao_final(None, 3.2) == 3.2


def test_teto_e_piso_do_formato():
    assert cf.duracao_final(999, 60) == cf.DUR_MAX
    assert cf.duracao_final(0.1, 60) == cf.DUR_MIN
    assert cf.duracao_final(None, 60) == cf.DUR_PADRAO


def test_clipe_minusculo_nao_vira_duracao_zero():
    assert cf.duracao_final(8, 0.1) > 0


# ------------------------------------------------------------ texto na tela
def test_frase_curta_fica_no_corpo_grande():
    fs, linhas = cf.ajustar("SEM FORCA DE VONTADE", medidor_falso())
    assert len(linhas) <= 2
    assert fs > 90


def test_frase_longa_encolhe_ate_caber():
    # No corpo inicial esta frase passaria de 5 linhas: tem que encolher.
    frase = ("O SEU INTESTINO DECIDE MAIS DO SEU PESO DO QUE A SUA BALANCA "
             "E ISSO MUDA A SUA CONDUTA DE HOJE")
    grande, _ = cf.ajustar("CURTA", medidor_falso())
    fs, linhas = cf.ajustar(frase, medidor_falso())
    assert len(linhas) <= 5, linhas
    assert fs < grande, (fs, grande)


def test_nunca_corta_a_frase():
    # Encolher é aceitável; cortar texto que a profissional escreveu não é.
    # Medidor largo de propósito: nem no corpo mínimo a frase cabe em 5
    # linhas, e é justamente aí que a tentação de dar um slice aparece.
    frase = ("VOCE NAO ESTA SEM FORCA DE VONTADE O SEU CORPO ESTA "
             "PEDINDO OUTRA COISA E ISSO TEM NOME")
    _, linhas = cf.ajustar(frase, medidor_falso(120))
    assert len(linhas) > 5, "o caso precisa estourar o limite pra a trava valer"
    assert " ".join(linhas).split() == frase.split()


def test_palavra_gigante_nao_trava_o_ajuste():
    _, linhas = cf.ajustar("ANTIINFLAMATORIOMITOCONDRIALPROLONGADO", medidor_falso())
    assert linhas == ["ANTIINFLAMATORIOMITOCONDRIALPROLONGADO"]


# ------------------------------------------------------------ ASS
def test_ass_tem_a_frase_a_assinatura_e_a_faixa():
    ass = cf.montar_ass("VOCE NAO ESTA SEM FORCA", 8.0, "@nutri", "Scanner da Saúde", medidor_falso())
    assert "VOCE NAO ESTA SEM FORCA" in ass.replace("\\N", " ")
    assert "@nutri" in ass
    assert "Style: Fundo" in ass and "alpha&H4D&" in ass  # faixa atrás do texto


def test_ass_respeita_o_estilo_de_legenda_escolhido():
    # Editorial é caixa mista: a frase não pode sair em caixa alta.
    ass = cf.montar_ass("Você não está sem força", 8.0, "@x", "y", medidor_falso(), estilo="editorial")
    assert "Você não está sem força" in ass.replace("\\N", " ")
    assert "Fraunces" in ass


def test_ass_escapa_chave():
    # Chave crua vira tag de override do libass e some com o texto.
    ass = cf.montar_ass("preço {especial}", 5.0, "@x", "y", medidor_falso(), estilo="editorial")
    assert "{especial}" not in ass


# ------------------------------------------------------------ posição
def _faixa(ass):
    """(topo, altura) da tarja e y do texto, lidos do ASS."""
    import re
    fy = int(re.search(r"\\pos\(0,(-?\d+)\)\\an7", ass).group(1))
    fh = int(re.search(r"1080 (\d+) 0 \d+", ass).group(1))
    y = int(re.search(r"\\pos\(540,(\d+)\)\\fs", ass).group(1))
    return fy, fh, y


def test_posicao_fora_da_faixa_vira_o_limite():
    # Recusar jogaria fora um vídeo inteiro por causa de um número.
    assert cf.posicao_faixa(0) == cf.POS_MIN
    assert cf.posicao_faixa(1) == cf.POS_MAX
    assert cf.posicao_faixa(-9) == cf.POS_MIN
    assert cf.posicao_faixa(99) == cf.POS_MAX


def test_posicao_sem_sentido_cai_no_centro():
    for v in (None, "", "abc", float("nan"), float("inf"), [], True, False):
        assert cf.posicao_faixa(v) == cf.POS_PADRAO, v


def test_posicao_aceita_texto_do_banco():
    # PostgREST devolve numeric como string: "0.300" tem que valer 0.3.
    assert cf.posicao_faixa("0.300") == 0.3


def test_REGRESSAO_o_padrao_e_o_centro_exato():
    # Este número é o que faz o vídeo sair igual ao de antes da escolha
    # existir. Mudar aqui redesenha vídeo que já está no ar.
    ass = cf.montar_ass("O seu intestino fala", 8.0, "@x", "y", medidor_falso())
    _, _, y = _faixa(ass)
    assert y == cf.H // 2
    assert cf.montar_ass("O seu intestino fala", 8.0, "@x", "y", medidor_falso(), None, 0.5) == ass
    assert cf.montar_ass("O seu intestino fala", 8.0, "@x", "y", medidor_falso(), None, None) == ass


def test_a_frase_e_a_tarja_andam_JUNTAS():
    # Mover só a tarja deixaria a frase sobrando pra fora dela.
    for pos in (0.18, 0.3, 0.5, 0.7, 0.82):
        fy, fh, y = _faixa(cf.montar_ass("O seu intestino fala", 8.0, "@x", "y", medidor_falso(), None, pos))
        assert fy <= y <= fy + fh, (pos, fy, fh, y)


def test_REGRESSAO_a_tarja_nunca_sai_da_tela():
    # Meia tarja saindo pela borda é pior que um centímetro fora do lugar.
    # 🔴 O medidor tem que produzir a tarja MAIS ALTA possível (5 linhas em
    # corpo cheio): com letra pequena a tarja cabe em qualquer posição e o
    # teste passa verde sem olhar pra nada.
    gordo = medidor_falso(26)
    frase5 = "palavra " * 14
    assert len(cf.ajustar(frase5, gordo)[1]) == 5, "o medidor precisa dar 5 linhas"
    for frase, med in (("Oi", medidor_falso()), (frase5, gordo)):
        for pos in (0.18, 0.5, 0.82):
            fy, fh, y = _faixa(cf.montar_ass(frase, 8.0, "@x", "y", med, None, pos))
            assert fy >= 0 and fy + fh <= cf.H, (frase[:10], pos, fy, fh)
            assert fy <= y <= fy + fh, (frase[:10], pos, fy, fh, y)


def test_REGRESSAO_a_tarja_nunca_cobre_a_assinatura():
    # O @handle mora no pé do vídeo (y=1800). Tarja por cima dele some com a
    # assinatura — e é ela que diz de quem é o vídeo.
    for frase, med in (("Oi", medidor_falso()), ("palavra " * 14, medidor_falso(26))):
        fy, fh, _ = _faixa(cf.montar_ass(frase, 8.0, "@x", "y", med, None, 0.82))
        assert fy + fh <= int(cf.H * cf.PISO_FAIXA), (frase[:10], fy + fh)


def test_posicao_move_de_verdade():
    _, _, alto = _faixa(cf.montar_ass("Oi", 8.0, "@x", "y", medidor_falso(), None, 0.2))
    _, _, baixo = _faixa(cf.montar_ass("Oi", 8.0, "@x", "y", medidor_falso(), None, 0.8))
    assert alto < cf.H // 2 < baixo


if __name__ == "__main__":
    falhas = 0
    for nome, fn in sorted(globals().items()):
        if nome.startswith("test_") and callable(fn):
            try:
                fn()
                print("ok  ", nome)
            except Exception as e:
                falhas += 1
                print("FALHOU", nome, "->", e)
    print(f"\n{falhas} falha(s)")
    sys.exit(1 if falhas else 0)
