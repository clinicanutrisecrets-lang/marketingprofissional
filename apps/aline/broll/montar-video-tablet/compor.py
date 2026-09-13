# Compoe as telas dentro do tablet quadro a quadro, em memoria.
#
# Por que nao no ffmpeg: com "-loop 1 -i tela.png" o PNG e redecodificado
# a cada quadro, e com cinco telas grandes o render leva meia hora pra um
# video de um minuto. Aqui a imagem entra uma vez na memoria e o que
# acontece por quadro e um recorte e uma mistura de 794x1200 — o video
# inteiro sai em pouco mais de um minuto.

import json, subprocess, sys, pathlib
import cv2, numpy as np

AQUI = pathlib.Path(__file__).parent
FF = "/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2"
X, Y, LARG, ALT = 148, 375, 794, 1200      # a tela dentro de 1080x1920
FPS = 24


def compor(base, roteiro, saida, meta="telas-pre.json"):
    M = json.load(open(AQUI/meta))
    telas = {}
    for nome, *_ in roteiro:
        if nome not in telas:
            telas[nome] = cv2.imread(str(AQUI/M[nome]["arquivo"]))

    m = cv2.imread(str(AQUI/"mascara-tela.png"), 0).astype(np.float32)/255.0
    alfa = m[:, :, None]

    cap = cv2.VideoCapture(str(AQUI/base))
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    p = subprocess.Popen(
        [FF, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24",
         "-s", "1080x1920", "-r", str(FPS), "-i", "-",
         "-an", "-c:v", "libx264", "-crf", "19", "-preset", "medium",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(AQUI/saida)],
        stdin=subprocess.PIPE)

    i = 0
    while True:
        ok, quadro = cap.read()
        if not ok:
            break
        t = i / FPS
        for nome, t0, t1, atraso, taxa in roteiro:
            if t0 <= t < t1:
                rol = M[nome]["rolagem"]
                y = int(min(rol, max(0, (t - t0 - atraso) * taxa))) if taxa else 0
                pedaco = telas[nome][y:y+ALT, :, :].astype(np.float32)
                fundo = quadro[Y:Y+ALT, X:X+LARG, :].astype(np.float32)
                quadro[Y:Y+ALT, X:X+LARG, :] = (
                    pedaco*alfa + fundo*(1-alfa)).astype(np.uint8)
                break
        p.stdin.write(quadro.tobytes())
        i += 1
    cap.release(); p.stdin.close(); p.wait()
    print(f"{saida}: {i} quadros, {i/FPS:.2f}s")


if __name__ == "__main__":
    qual = sys.argv[1] if len(sys.argv) > 1 else "paciente"
    if qual == "paciente":
        from montar_tablet import ROTEIRO
        compor("base-tablet.mp4", ROTEIRO, "tab-paciente.mp4")
    else:
        from montar_profissional import ROTEIRO
        compor("base-tablet.mp4", ROTEIRO, "tab-profissional.mp4")
