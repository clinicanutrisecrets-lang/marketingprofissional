# Corta o corpo em 59s, emenda a helice de DNA e queima a legenda.
#
# fps=24 no filtro e -r 24 na saida nao sao enfeite: sem eles a saida
# vira 25 fps e todo o tempo da legenda anda junto.
# xfade erra a duracao quando as entradas tem base de tempo diferente,
# entao a emenda e fade out + fade in + concat.

import subprocess, sys, pathlib

AQUI = pathlib.Path(__file__).parent
FF = "/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2"
CENARIOS = pathlib.Path("/home/user/marketingprofissional/apps/aline/broll/cenarios")
CORPO = 59.0          # onde o corpo termina e a helice entra


def roda(*args):
    subprocess.run([FF, "-v", "error", "-y", *args], check=True)


def montar(corpo, ass, saida):
    roda("-i", str(AQUI/corpo), "-t", str(CORPO),
         "-vf", f"fps=24,fade=t=out:st={CORPO-0.6}:d=0.6,format=yuv420p",
         "-r", "24", "-an", "-c:v", "libx264", "-crf", "18", "-preset", "medium",
         str(AQUI/"_corpo.mp4"))
    # a helice tem 6s e gira rapido demais pra dar tempo de ler a chamada
    roda("-i", str(CENARIOS/"dna-helice.mp4"),
         "-vf", "setpts=1.34*PTS,eq=brightness=-0.03:saturation=1.05,"
                "scale=1080:1920:flags=lanczos,fps=24,fade=t=in:st=0:d=0.6,format=yuv420p",
         "-r", "24", "-an", "-c:v", "libx264", "-crf", "18", "-preset", "medium",
         str(AQUI/"_dna.mp4"))
    lista = AQUI/"_lista.txt"
    lista.write_text(f"file '{AQUI/'_corpo.mp4'}'\nfile '{AQUI/'_dna.mp4'}'\n")
    roda("-f", "concat", "-safe", "0", "-i", str(lista), "-c", "copy",
         str(AQUI/"_junto.mp4"))
    roda("-i", str(AQUI/"_junto.mp4"),
         "-vf", f"fps=24,subtitles={AQUI/ass}:fontsdir=/usr/share/fonts,format=yuv420p",
         "-r", "24", "-an", "-c:v", "libx264", "-crf", "22", "-preset", "medium",
         "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709",
         "-color_trc", "bt709", "-movflags", "+faststart", str(AQUI/saida))
    print(saida)


if __name__ == "__main__":
    montar(sys.argv[1], sys.argv[2], sys.argv[3])
