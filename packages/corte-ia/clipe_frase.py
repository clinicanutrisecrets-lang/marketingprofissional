# -*- coding: utf-8 -*-
"""Vídeo curto: um clipe da biblioteca com a frase escrita em cima.

Pedido da Aline (22/09/2026): "fazer aqueles vídeos curtinhos que é só o
vídeo com uma escrita em cima, que está na moda".

🔴 ESTE CAMINHO NÃO PASSA POR FALA. O corte de sempre (`pipeline.py`) parte
de uma gravação COM voz: a legenda sai da transcrição, palavra por palavra.
Aqui não há voz nenhuma — o texto é a frase que ela escreveu, e o vídeo é só
imagem. Por isso é um renderizador à parte, e não um `if` dentro do
`render.render`: lá dentro, todo cálculo de tempo depende das palavras.

🔴 O ÁUDIO DO CLIPE É PRESERVADO QUANDO EXISTE, e vira silêncio quando não.
Não entra música: não temos trilha licenciada, e publicar vídeo com música
de terceiro no Instagram da profissional é problema dela, não nosso. No
Instagram esse formato normalmente ganha o áudio em alta na hora de postar.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import legenda_estilos  # noqa: E402
import render  # noqa: E402

W, H = render.W, render.H
WHITE = render.WHITE

#: Teto do vídeo. Acima disso não é mais "curtinho", e o clipe de b-roll da
#: biblioteca raramente tem mais que isso de imagem aproveitável.
DUR_MAX = 15.0
DUR_MIN = 2.0
DUR_PADRAO = 8.0

#: A frase precisa caber na tela em corpo grande. Acima disso a letra fica do
#: tamanho de legenda e o formato perde a razão de existir.
FRASE_MAX = 120

MARGEM_X = 110


class FraseInvalida(ValueError):
    """A frase não serve — a tela precisa dizer o motivo, não gerar mudo."""


def normalizar_frase(frase):
    """Frase limpa e pronta pra tela, ou erro com o motivo."""
    t = " ".join((frase or "").split())
    if not t:
        raise FraseInvalida("escreva a frase que vai aparecer no vídeo")
    if len(t) > FRASE_MAX:
        raise FraseInvalida(
            f"a frase tem {len(t)} caracteres; no vídeo curto cabem {FRASE_MAX}. "
            "Corte pro essencial, que é o que faz esse formato funcionar."
        )
    return t


def duracao_final(pedida, duracao_clipe):
    """Nunca passa do clipe: repetir ou congelar frame entrega vídeo travado."""
    d = DUR_PADRAO if not pedida else float(pedida)
    d = max(DUR_MIN, min(DUR_MAX, d))
    return round(min(d, max(0.5, duracao_clipe)), 2)


def quebrar(frase, text_w, fs, largura):
    """Quebra por palavra na largura disponível."""
    linhas, atual = [], ""
    for p in frase.split(" "):
        teste = f"{atual} {p}".strip()
        if atual and text_w(teste, fs) > largura:
            linhas.append(atual)
            atual = p
        else:
            atual = teste
    if atual:
        linhas.append(atual)
    return linhas


def ajustar(frase, text_w, fs_inicial=118, max_linhas=5):
    """Corpo que faz a frase caber em até `max_linhas`, sem estourar a largura.

    🔴 Encolhe até caber e PARA no piso: frase que não cabe nem no piso sai
    com o corpo mínimo e mais linhas, nunca cortada. Texto clínico cortado no
    meio é pior que texto pequeno.
    """
    largura = W - MARGEM_X * 2
    fs = fs_inicial
    while fs > 54:
        linhas = quebrar(frase, text_w, fs, largura)
        maior = max((text_w(l, fs) for l in linhas), default=0)
        if len(linhas) <= max_linhas and maior <= largura:
            return fs, linhas
        fs = int(fs * 0.92)
    return fs, quebrar(frase, text_w, fs, largura)


def montar_ass(frase, dur, handle, rodape, text_w, estilo=None):
    est = legenda_estilos.por_nome(estilo)
    texto = frase.upper() if est["caixa_alta"] else frase
    fs, linhas = ajustar(texto, text_w)
    corpo = "\\N".join(render.esc(l) for l in linhas)

    # Faixa escura de ponta a ponta atrás do texto: o clipe é imagem
    # qualquer, e branco sobre imagem clara some. Cobre exatamente o bloco.
    altura_bloco = int(len(linhas) * fs * 1.22)
    pad = 70
    faixa_h = altura_bloco + pad * 2
    faixa_y = max(0, (H - faixa_h) // 2)
    faixa = (f"Dialogue: 0,{render.ts(0)},{render.ts(dur)},Fundo,,0,0,0,,"
             f"{{\\pos(0,{faixa_y})\\an7\\p1\\c&H000000&\\alpha&H4D&}}"
             f"m 0 0 l {W} 0 {W} {faixa_h} 0 {faixa_h}{{\\p0}}")

    frase_ev = (f"Dialogue: 1,{render.ts(0)},{render.ts(dur)},Frase,,0,0,0,,"
                f"{{\\pos(540,{H // 2})\\fs{fs}\\fad(260,300)"
                f"\\fscx94\\fscy94\\t(0,320,\\fscx100\\fscy100)}}{corpo}")

    tag = (f"Dialogue: 0,{render.ts(0)},{render.ts(dur)},Tag,,0,0,0,,"
           f"{{\\pos(540,1800)}}{render.esc(rodape)}   |   {render.esc(handle)}")

    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Frase,{est['fonte_capa']},{fs},{WHITE},{WHITE},&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,5,{MARGEM_X},{MARGEM_X},0,1
Style: Tag,Inter,34,&HB4A39B&,&HB4A39B&,&H00000000,&H00000000,0,0,0,0,100,100,2,0,1,0,0,5,40,40,0,1
Style: Fundo,Inter,20,&H000000&,&H000000&,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join([faixa, frase_ev, tag]) + "\n"


def tem_audio(caminho):
    r = render.run(["ffprobe", "-v", "error", "-select_streams", "a",
                    "-show_entries", "stream=index", "-of", "csv=p=0", caminho], check=False)
    return bool((r.stdout or "").strip())


def render_clipe_frase(clipe, frase, out, fontsdir, handle="@nutri",
                       rodape="Scanner da Saúde", segundos=None, estilo=None):
    """Gera o MP4 9:16 com a frase por cima do clipe."""
    frase = normalizar_frase(frase)
    _, _, dur_clipe = render.probe(clipe)
    dur = duracao_final(segundos, dur_clipe)

    font = render.preparar_fontes(fontsdir)
    text_w = render.medidor(font)
    ass_path = os.path.join(os.path.dirname(out) or ".", "clipe.ass")
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(montar_ass(frase, dur, handle, rodape, text_w, estilo))

    # O clipe entra como o b-roll em retrato já entra no corte: fundo
    # desfocado + imagem centralizada. Clipe deitado sem isso vira duas
    # tarjas pretas ocupando metade do vídeo.
    fc = [render.filtro_fonte("0:v", "retrato", None) + f"[base]",
          f"[base]trim=0:{dur},setpts=PTS-STARTPTS,ass={ass_path}:fontsdir={fontsdir},"
          f"fade=t=in:st=0:d=0.3,fade=t=out:st={dur - 0.5:.2f}:d=0.5[v]"]

    inputs = ["-i", clipe]
    if tem_audio(clipe):
        fc.append(f"[0:a]atrim=0:{dur},asetpts=PTS-STARTPTS,"
                  f"loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st={dur - 0.5:.2f}:d=0.5[a]")
    else:
        # Sem trilha o Instagram ainda aceita, mas alguns players tratam
        # vídeo sem faixa de áudio como arquivo quebrado.
        inputs += ["-f", "lavfi", "-t", str(dur), "-i", "anullsrc=r=44100:cl=stereo"]
        fc.append("[1:a]anull[a]")

    render.run(["ffmpeg", "-hide_banner", "-y"] + inputs + [
        "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-t", str(dur), out])
    return {"duracao": dur, "frase": frase, "linhas": len(ajustar(
        frase.upper() if legenda_estilos.por_nome(estilo)["caixa_alta"] else frase, text_w)[1])}
