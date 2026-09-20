# -*- coding: utf-8 -*-
"""Aplica o filtro (e opcionalmente troca o cenario) num video.

  python3 cli.py entrada.mp4 saida.mp4 [--cenario foto.png] [--preset elegante]
                 [--verde] [--sem-maquiagem]

Duas formas de recortar, e a diferenca importa:
  --verde   fundo verde/chroma: o recorte e CALCULADO (rapido e perfeito)
  (padrao)  fundo qualquer: recorte ESTIMADO por rede + matting (lento, bom)
"""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    p = argparse.ArgumentParser()
    p.add_argument("entrada"); p.add_argument("saida")
    p.add_argument("--cenario", default=None, help="foto de fundo (PNG/JPG)")
    p.add_argument("--verde", action="store_true", help="o video foi gravado em chroma")
    p.add_argument("--sem-maquiagem", action="store_true")
    p.add_argument("--trabalhadores", type=int, default=int(os.environ.get("TRAB", "3")))
    a = p.parse_args()

    import preset_elegante as P
    preset = None if a.sem_maquiagem else P.ELEGANTE

    if a.verde:
        import render_verde
        render_verde.render(a.entrada, a.saida, preset, a.cenario, trab=a.trabalhadores)
    elif a.cenario:
        import cena, render_matte
        from PIL import Image
        plate = a.cenario
        if os.environ.get("LIMPAR_CENARIO", "1") == "1":
            im = Image.open(a.cenario).convert("RGB")
            janela, fr = cena.janela_limpa(im, 9, 16)
            limpo, _ = cena.limpar_cenario(janela, folga=22)
            plate = "/tmp/plate.png"; limpo.save(plate)
            print("cenario: pessoa na janela %.0f%%" % (fr * 100), flush=True)
        render_matte.render(a.entrada, a.saida, preset, plate, trab=a.trabalhadores)
    else:
        import render_filtro
        render_filtro.render(a.entrada, a.saida, preset, trabalhadores=a.trabalhadores)

if __name__ == "__main__":
    main()
