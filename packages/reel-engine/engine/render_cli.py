# -*- coding: utf-8 -*-
"""CLI do motor de reels: renderiza um MP4 a partir de um SPEC em JSON.

Uso:
  python3 render_cli.py spec.json saida.mp4 [--handle @fulana] [--anuncio]

O JSON tem o mesmo formato dos SPECs de exemplo (spec_exemplo_menopausa.py),
com cenas declarativas. Zero IA: PIL + ffmpeg, custo apenas de CPU.
"""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    spec_path, out_path = sys.argv[1], sys.argv[2]
    if "--handle" in sys.argv:
        build.HANDLE = sys.argv[sys.argv.index("--handle") + 1]
    if "--anuncio" in sys.argv:
        build.MODO_ANUNCIO = True
    with open(spec_path, encoding="utf-8") as f:
        spec = json.load(f)
    build.render(spec, out_path)
    print("OK", out_path)

if __name__ == "__main__":
    main()
