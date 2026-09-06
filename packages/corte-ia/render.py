# -*- coding: utf-8 -*-
"""
Renderizador do "corte com IA": pega a gravação (qualquer proporção), a
transcrição com timestamps por palavra e o PLANO do Claude (capa, palavras-
chave por trecho, b-roll) e monta o reel 9:16 com ffmpeg + libass.

Zero IA de imagem, zero editor: cada elemento visual é texto ASS ou um corte
de vídeo. Estilo: capa gigante nos 3 primeiros segundos, palavra-chave grande
no topo por trecho, legendas alternando entre "grande embaixo" (caixa alta,
palavra falada em âmbar) e "pílula" (caixa arredondada, palavra falada em
itálico) — o mesmo template validado à mão com a Aline em 05/09/2026.

Uso direto (debug):
  python3 render.py --video in.mp4 --transcricao t.json --plano p.json \
      --broll-dir ./broll --handle @fulana --out saida.mp4
"""
import argparse, json, os, shlex, subprocess, sys, tempfile
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

W, H = 1080, 1920
AMBER, TIFF, WHITE = "&H0B9EF5&", "&HA8B80B&", "&HFFFFFF&"
NAVY_HEX = "171627"
ROT = ["big", "pill_band", "big", "pill_top", "big", "pill_band", "big"]

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS_SRC = os.path.join(HERE, "..", "reel-engine", "fonts")


# ---------------------------------------------------------------- utilidades
def run(cmd, check=True):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if check and r.returncode != 0:
        raise RuntimeError(f"comando falhou ({r.returncode}): {' '.join(shlex.quote(c) for c in cmd)}\n{r.stderr[-2000:]}")
    return r


def probe(path):
    try:
        r = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                 "stream=width,height:format=duration", "-of", "json", path])
        j = json.loads(r.stdout)
        st = j["streams"][0]
        return int(st["width"]), int(st["height"]), float(j["format"]["duration"])
    except (FileNotFoundError, RuntimeError):
        # build estático sem ffprobe: lê do cabeçalho do próprio ffmpeg
        import re
        out = run(["ffmpeg", "-hide_banner", "-i", path], check=False).stderr
        m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out)
        dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
        wh = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", out)
        return int(wh.group(1)), int(wh.group(2)), dur


def ts(t):
    t = max(0.0, t)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def esc(t):
    return t.replace("{", "").replace("}", "").replace("\\", "")


def preparar_fontes(dest):
    """Inter/Fraunces do reel-engine são variáveis; libass não sintetiza
    negrito nelas. Gera instâncias estáticas Bold/Black (fontTools)."""
    os.makedirs(dest, exist_ok=True)
    src_inter = os.path.join(FONTS_SRC, "Inter.ttf")
    src_fraunces = os.path.join(FONTS_SRC, "Fraunces.ttf")
    for w, name in [(700, "InterBold"), (900, "InterBlack")]:
        out = os.path.join(dest, f"{name}.ttf")
        if os.path.exists(out):
            continue
        f = TTFont(src_inter)
        inst = instancer.instantiateVariableFont(f, {"wght": w})
        for rec in inst["name"].names:
            if rec.nameID in (1, 4, 6, 16):
                rec.string = name
            if rec.nameID == 2:
                rec.string = "Regular"
        inst.save(out)
    for src in (src_inter, src_fraunces):
        out = os.path.join(dest, os.path.basename(src))
        if not os.path.exists(out):
            TTFont(src).save(out)
    inter = TTFont(os.path.join(dest, "InterBold.ttf"))
    return inter


def medidor(font):
    cmap = font.getBestCmap(); hmtx = font["hmtx"]; upm = font["head"].unitsPerEm
    fallback = cmap[ord("n")]

    def text_w(txt, size):
        em = size * 0.80
        return sum(hmtx[cmap.get(ord(c), fallback)][0] for c in txt) / upm * em * 1.06
    return text_w


# ---------------------------------------------------------------- legendas
def blocos_de_legenda(palavras, correcoes):
    fix = {c["de"]: c["para"] for c in (correcoes or [])}

    def corrige(t):
        core = t.strip(".,?!;:")
        suf = t[len(core):]
        return fix.get(core, fix.get(t, core)) + suf if core in fix or t in fix else t

    words = [{"t": corrige(w["t"]), "i": w["i"], "f": w["f"]} for w in palavras if w["t"].strip()]
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        txt = " ".join(x["t"] for x in cur)
        if len(cur) >= 5 or len(txt) >= 24 or w["t"][-1] in ".,?!":
            chunks.append(cur); cur = []
    if cur:
        chunks.append(cur)
    merged = []
    for c in chunks:
        if merged and len(c) == 1 and len(merged[-1]) <= 5:
            merged[-1] += c
        else:
            merged.append(c)
    sent_of, s = [], 0
    for c in merged:
        sent_of.append(s)
        if c[-1]["t"][-1] in ".?!":
            s += 1
    return merged, sent_of


def eventos_legenda(chunks, sent_of, layout, text_w):
    ev = []
    for ci, ch in enumerate(chunks):
        start = ch[0]["i"]; end = ch[-1]["f"] + 0.25
        if ci + 1 < len(chunks):
            end = min(end, chunks[ci + 1][0]["i"])
        style = ROT[sent_of[ci] % len(ROT)]
        if style == "big":
            for k, w in enumerate(ch):
                a = w["i"] if k > 0 else start
                b = ch[k + 1]["i"] if k + 1 < len(ch) else end
                if b <= a:
                    continue
                parts = []
                for j, x in enumerate(ch):
                    t = esc(x["t"].upper())
                    parts.append(
                        f"{{\\c{AMBER}\\fscx86\\fscy86\\t(0,110,\\fscx100\\fscy100)}}{t}{{\\c{WHITE}\\fscx100\\fscy100}}"
                        if j == k else t)
                ev.append(f"Dialogue: 1,{ts(a)},{ts(b)},Cap,,0,0,0,,{{\\pos(540,{layout['cap_big_y']})}}" + " ".join(parts))
        else:
            cy = layout["cap_pill_band_y"] if style == "pill_band" else layout["cap_pill_top_y"]
            size = 56
            full = " ".join(x["t"] for x in ch)
            Wp = min(text_w(full, size) + 90, 1000); Hp = 96; r = 48
            x0 = 540 - Wp / 2; y0 = cy - Hp / 2
            path = (f"m {r} 0 l {Wp - r} 0 b {Wp} 0 {Wp} 0 {Wp} {r} l {Wp} {Hp - r} b {Wp} {Hp} {Wp} {Hp} {Wp - r} {Hp} "
                    f"l {r} {Hp} b 0 {Hp} 0 {Hp} 0 {Hp - r} l 0 {r} b 0 0 0 0 {r} 0")
            ev.append(f"Dialogue: 0,{ts(start)},{ts(end)},Pill,,0,0,0,,{{\\pos({x0:.0f},{y0:.0f})\\an7\\p1\\fad(120,80)}}{path}{{\\p0}}")
            for k, w in enumerate(ch):
                a = w["i"] if k > 0 else start
                b = ch[k + 1]["i"] if k + 1 < len(ch) else end
                if b <= a:
                    continue
                parts = []
                for j, x in enumerate(ch):
                    t = esc(x["t"])
                    parts.append(f"{{\\c{AMBER}\\i1\\fnInterBlack}}{t}{{\\c{WHITE}\\i0\\fnInterBold}}" if j == k else t)
                ev.append(f"Dialogue: 1,{ts(a)},{ts(b)},PillTxt,,0,0,0,,{{\\pos(540,{cy})}}" + " ".join(parts))
    return ev


def montar_ass(plano, palavras, dur, layout, handle, rodape, text_w):
    chunks, sent_of = blocos_de_legenda(palavras, plano.get("correcoes"))
    ev = eventos_legenda(chunks, sent_of, layout, text_w)

    capa = plano.get("capa") or {}
    l1 = esc(capa.get("linha1", "")).upper()[:14]
    l2 = esc(capa.get("linha2", "")).upper()[:18]
    apoio = esc(capa.get("apoio", ""))[:48]
    cover_end = min(3.0, dur)
    fs1 = 150 if len(l1) <= 9 else 118
    fs2 = 104 if len(l2) <= 12 else 84
    cover = (f"Dialogue: 2,{ts(0)},{ts(cover_end)},Cover,,0,0,0,,{{\\pos(540,{layout['key_y'] + 60})\\fad(0,200)\\fscx92\\fscy92\\t(0,250,\\fscx100\\fscy100)}}"
             f"{{\\c{TIFF}\\fs{fs1}}}{l1}\\N{{\\c{WHITE}\\fs{fs2}}}{l2}\\N{{\\fs50\\b0\\fnFraunces\\c&HDDDDDD&}}{apoio}")

    keyev = []
    for sec in plano.get("secoes") or []:
        a = max(float(sec["inicio"]), cover_end); b = min(float(sec["fim"]), dur)
        if b - a < 0.8:
            continue
        k = esc(str(sec.get("palavra_chave", ""))).upper()[:14]
        fs = 150 if len(k) <= 9 else 112
        keyev.append(f"Dialogue: 2,{ts(a)},{ts(b)},Key,,0,0,0,,{{\\pos(540,{layout['key_y']})\\fad(150,150)\\fs{fs}\\fscx85\\fscy85\\t(0,220,\\fscx100\\fscy100)}}{k}")
        sub = esc(capa.get("linha1", ""))
        if sub:
            keyev.append(f"Dialogue: 2,{ts(a)},{ts(b)},Tag,,0,0,0,,{{\\pos(540,{layout['key_y'] + 110})\\fad(150,150)\\c{TIFF}}}{sub}")

    tag = f"Dialogue: 0,{ts(0)},{ts(dur)},Tag,,0,0,0,,{{\\pos(540,{layout['tag_y']})}}{esc(rodape)}   |   {esc(handle)}"
    progress = [
        f"Dialogue: 0,{ts(i / 10)},{ts(i / 10 + 0.1)},Bar,,0,0,0,,{{\\pos(0,1905)\\p1\\c{TIFF}}}m 0 0 l {int(W * (i / 10) / dur)} 0 {int(W * (i / 10) / dur)} 8 0 8{{\\p0}}"
        for i in range(int(dur * 10))
    ]
    # Faixas escuras atrás do texto quando o vídeo ocupa a tela toda
    fundo = []
    if layout["modo"] == "retrato":
        fundo.append(f"Dialogue: 0,{ts(0)},{ts(dur)},Fundo,,0,0,0,,{{\\pos(0,0)\\an7\\p1\\c&H000000&\\alpha&H55&}}m 0 0 l {W} 0 {W} 620 0 620{{\\p0}}")
        fundo.append(f"Dialogue: 0,{ts(0)},{ts(dur)},Fundo,,0,0,0,,{{\\pos(0,1420)\\an7\\p1\\c&H000000&\\alpha&H55&}}m 0 0 l {W} 0 {W} 500 0 500{{\\p0}}")

    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cover,InterBlack,150,{WHITE},{WHITE},&H00000000,&H00000000,-1,0,0,0,100,100,-2,0,1,0,0,5,30,30,0,1
Style: Key,InterBlack,150,{WHITE},{WHITE},&H00000000,&H00000000,-1,0,0,0,100,100,-3,0,1,0,0,5,30,30,0,1
Style: Cap,InterBold,92,{WHITE},{WHITE},&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,5,3,5,60,60,0,1
Style: Pill,Inter,20,&H3A2E2B&,&H3A2E2B&,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: PillTxt,InterBold,56,{WHITE},{WHITE},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,60,60,0,1
Style: Tag,Inter,34,&HB4A39B&,&HB4A39B&,&H00000000,&H00000000,0,0,0,0,100,100,2,0,1,0,0,5,40,40,0,1
Style: Bar,Inter,20,{TIFF},{TIFF},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: Fundo,Inter,20,&H000000&,&H000000&,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(fundo + [cover, tag] + keyev + ev + progress) + "\n"


# ---------------------------------------------------------------- vídeo
def timeline(plano, dur, broll_files):
    """Lista de (fonte, inicio, fim). fonte = 'head' ou caminho do b-roll."""
    cortes = []
    for b in plano.get("broll") or []:
        f = broll_files.get(str(b.get("video_id")))
        if not f:
            continue
        a, z = float(b["inicio"]), float(b["fim"])
        a = max(a, 3.0); z = min(z, dur - 3.0, a + 6.0)
        if z - a >= 2.0:
            cortes.append((a, z, f))
    cortes.sort()
    tl, cur = [], 0.0
    for a, z, f in cortes:
        if a < cur + 1.0:
            continue
        tl.append(("head", cur, a)); tl.append((f, a, z)); cur = z
    tl.append(("head", cur, dur))
    return [s for s in tl if s[2] - s[1] > 0.04]


def filtro_fonte(label, modo, band_h):
    """Normaliza um clipe pra faixa (paisagem) ou tela cheia (retrato)."""
    if modo == "faixa":
        # preenche a faixa (corta as laterais se o clipe for mais largo que ela)
        return (f"[{label}]scale={W}:{band_h}:force_original_aspect_ratio=increase,"
                f"crop={W}:{band_h},setsar=1,fps=25")
    # retrato: fundo desfocado + clipe centralizado na largura
    return (f"[{label}]split=2[{label}bg][{label}fg];"
            f"[{label}bg]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=30,setsar=1,fps=25[{label}bgo];"
            f"[{label}fg]scale={W}:-2,setsar=1,fps=25[{label}fgo];"
            f"[{label}bgo][{label}fgo]overlay=0:(H-h)/2")


def render(video, transcricao, plano, broll_files, handle, rodape, out, fontsdir):
    w0, h0, dur = probe(video)
    retrato = h0 > w0
    palavras = [w for s in transcricao for w in s["palavras"]]
    dur = max(dur, (palavras[-1]["f"] + 0.5) if palavras else dur)
    dur = round(dur, 2)

    if retrato:
        layout = {"modo": "retrato", "key_y": 330, "cap_big_y": 1500, "cap_pill_band_y": 1240,
                  "cap_pill_top_y": 560, "tag_y": 1800}
        band_h = None
    else:
        # faixa = altura do vídeo escalado pra 1080 de largura, com teto de 800
        # (vídeo quadrado perde um pouco de cima e de baixo, nunca o rosto)
        band_h = min(int(W * h0 / w0), 800)
        band_h -= band_h % 2
        band_y = (H - band_h) // 2 - 80
        key_y = max(150, band_y - 330)  # palavra-chave, subtítulo e pílula cabem acima da faixa
        layout = {"modo": "faixa", "key_y": key_y, "cap_big_y": band_y + band_h + 220,
                  "cap_pill_band_y": band_y + band_h - 60, "cap_pill_top_y": key_y + 220,
                  "tag_y": 1760, "band_y": band_y, "band_h": band_h}

    font = preparar_fontes(fontsdir)
    text_w = medidor(font)
    ass_path = os.path.join(os.path.dirname(out) or ".", "corte.ass")
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(montar_ass(plano, palavras, dur, layout, handle, rodape, text_w))

    tl = timeline(plano, dur, broll_files)
    fontes = sorted({s[0] for s in tl if s[0] != "head"})
    inputs = ["-i", video] + sum([["-i", f] for f in fontes], [])
    idx = {f: i + 1 for i, f in enumerate(fontes)}
    nh = sum(1 for s in tl if s[0] == "head")

    fc = []
    if retrato:
        fc.append(f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps=25,split={nh}" + "".join(f"[h{i}]" for i in range(nh)))
    else:
        fc.append(f"[0:v]scale={W}:{band_h}:force_original_aspect_ratio=increase,crop={W}:{band_h},setsar=1,fps=25,split={nh}" + "".join(f"[h{i}]" for i in range(nh)))
    segs, hi = [], 0
    for n, (src, a, b) in enumerate(tl):
        if src == "head":
            fc.append(f"[h{hi}]trim={a}:{b},setpts=PTS-STARTPTS[s{n}]"); hi += 1
        else:
            modo = "retrato" if retrato else "faixa"
            fc.append(filtro_fonte(f"{idx[src]}:v", modo, band_h) + f",trim=0:{b - a:.2f},setpts=PTS-STARTPTS[s{n}]")
        segs.append(f"[s{n}]")
    fc.append("".join(segs) + f"concat=n={len(segs)}:v=1:a=0[band]")
    if retrato:
        fc.append(f"[band]ass={ass_path}:fontsdir={fontsdir},fade=t=out:st={dur - 0.6}:d=0.6[v]")
    else:
        fc.append(f"color=c=0x{NAVY_HEX}:s={W}x{H}:d={dur}:r=25[bg]")
        fc.append(f"[bg][band]overlay=0:{layout['band_y']}:shortest=1,ass={ass_path}:fontsdir={fontsdir},fade=t=out:st={dur - 0.6}:d=0.6[v]")
    fc.append(f"[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st={dur - 0.6:.2f}:d=0.6[a]")

    cmd = ["ffmpeg", "-hide_banner", "-y"] + inputs + [
        "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-t", str(dur), out]
    run(cmd)
    return {"duracao": dur, "modo": layout["modo"], "cortes_broll": len(tl) - nh}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--transcricao", required=True)
    ap.add_argument("--plano", required=True)
    ap.add_argument("--broll-dir", default="")
    ap.add_argument("--handle", default="@nutri")
    ap.add_argument("--rodape", default="Scanner da Saúde")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    with open(a.transcricao, encoding="utf-8") as f:
        transcricao = json.load(f)
    with open(a.plano, encoding="utf-8") as f:
        plano = json.load(f)
    broll = {}
    if a.broll_dir and os.path.isdir(a.broll_dir):
        for fn in os.listdir(a.broll_dir):
            broll[os.path.splitext(fn)[0]] = os.path.join(a.broll_dir, fn)
    fontsdir = os.path.join(tempfile.gettempdir(), "corte-fonts")
    print(render(a.video, transcricao, plano, broll, a.handle, a.rodape, a.out, fontsdir))


if __name__ == "__main__":
    main()
