# -*- coding: utf-8 -*-
"""O filtro 'Elegante' — aprovado por ela em 12/09/2026, na terceira versão.

Os numeros abaixo nao sao chute: cada um foi ajustado contra o que ela
recusou. A regra que sobreviveu as tres rodadas e NAO MEXER NA PELE —
nao clarear, nao dessaturar, nao borrar. O rosto dela sai como esta; o que
muda e o cabelo (contraste, nao saturacao), mais batom e delineador.

Medido no frame aprovado: pele 176,0 -> 176,8 de luz e 20,9 -> 20,7 de
saturacao (ou seja, intacta), enquanto o cabelo foi de 46,2 para 41,1 de
luz e a definicao subiu de 4,25 para 6,28.
"""
import numpy as np, os, subprocess
from PIL import Image
import imageio_ffmpeg
import filtro3 as F
import maquiagem as M

FF = imageio_ffmpeg.get_ffmpeg_exe()

ELEGANTE = dict(
    # pele e cabelo — aprovados em 12/09 ("cabelo ficou otimo, tom da pele otimo")
    cabelo_contraste=0.30,
    cabelo_profundidade=0.22,
    limpeza=0.30,
    nitidez=52,
    # batom VINHO AVERMELHADO (Aline 12/09: o rosa 'ta mto rosao'). So trocar
    # a cor nao bastava — 'escurecer' e o que separa vinho de rosa. Mas com 0,30
    # ficou escuro demais (12/09): o macro do labio engana, calibrar no ROSTO.
    forca_batom=0.52,
    cor_batom=(160, 46, 52), escurecer_batom=0.12,
    # delineador FORTE, de gatinho: ACIMA dos cilios com asa no canto externo.
    # A primeira versao desenhava na borda interna do olho e parecia lapis por
    # dentro — foi o que ela apontou.
    forca_delineador=0.95, levantar_delineador=0.55,
    asa_delineador=0.36,
    subir_delineador=0.32,
    forca_dentes=0.72,
)

def aplicar_quadro(im, pts=None, p=None):
    p = p or ELEGANTE
    out = F.aplicar(im, cabelo_contraste=p["cabelo_contraste"],
                    cabelo_profundidade=p["cabelo_profundidade"],
                    limpeza=p["limpeza"], nitidez=p["nitidez"])
    if pts is None: return out
    out = M.delineador(out, pts, forca=p["forca_delineador"])
    out = M.batom(out, pts, cor=p["cor_batom"], forca=p["forca_batom"],
                   escurecer=p.get("escurecer_batom", 0.0))
    # dentes por ULTIMO: o batom escurece a borda do labio e melhora o contorno
    # da abertura da boca, entao a mascara do dente sai mais limpa depois dele
    return M.dentes(out, pts, forca=p.get("forca_dentes", 0.55))

def _media(hist):
    """Media movel dos pontos do rosto. Sem ela o batom TREME: a deteccao
    oscila um ou dois pixels por quadro, e num traco fino isso pisca."""
    n = len(hist)
    return [tuple(sum(h[i][k] for h in hist)/n for k in (0,1)) for i in range(len(hist[0]))]

def aplicar_video(entrada, saida, p=None, janela=3, progresso=True, vf=None):
    r = subprocess.run([FF, "-i", entrada], capture_output=True, text=True)
    import re
    m = re.search(r", (\d+)x(\d+)", r.stderr)
    girado = "rotation of -90" in r.stderr or "rotation of 90" in r.stderr
    fps = re.search(r"(\d+(?:\.\d+)?) fps", r.stderr)
    W, H = int(m.group(1)), int(m.group(2))
    if girado: W, H = H, W
    FPS = float(fps.group(1)) if fps else 30.0

    cmd = [FF, "-v", "error", "-i", entrada]
    if vf: cmd += ["-vf", vf]
    src = subprocess.Popen(cmd + ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    tmp = saida + ".tmp.mp4"
    dst = subprocess.Popen([FF, "-y", "-v", "error", "-f", "rawvideo",
        "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-crf", "18", "-preset", "medium",
        "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)

    tam = W * H * 3
    hist, n, sem_rosto = [], 0, 0
    while True:
        b = src.stdout.read(tam)
        if len(b) < tam: break
        im = Image.frombytes("RGB", (W, H), b)
        pts = M.pontos(im)
        if pts is None:
            sem_rosto += 1                 # segura o ultimo rosto conhecido em
            pts = hist[-1] if hist else None   # vez de piscar a maquiagem
        else:
            hist.append(pts); hist[:] = hist[-janela:]
            pts = _media(hist)
        dst.stdin.write(aplicar_quadro(im, pts, p).tobytes())
        n += 1
        if progresso and n % 60 == 0: print(f"  {n} quadros", flush=True)

    src.stdout.close(); src.wait(); dst.stdin.close(); dst.wait()
    subprocess.run([FF, "-y", "-v", "error", "-i", tmp, "-i", entrada,
        "-map", "0:v", "-map", "1:a?", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
        "-shortest", "-movflags", "+faststart", saida], check=True)
    os.remove(tmp)
    print(f"pronto: {n} quadros, {sem_rosto} sem rosto detectado")
    return saida
