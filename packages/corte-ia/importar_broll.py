"""Importa clipes de b-roll de uma lista de URLs pra Biblioteca de clipes.

Uso (worker do GitHub Actions, `.github/workflows/importar-broll.yml`):
    python3 importar_broll.py --manifest scripts/dados/broll-aline-2026-09-28.json
    python3 importar_broll.py --manifest ... --acervo      # acervo compartilhado
    python3 importar_broll.py --manifest ... --dry-run --local-dir /pasta   # sem rede

Por que existe: a tela "Biblioteca de clipes" sobe um arquivo por vez, pelo
navegador, e a Aline tinha 48 clipes numa pasta do Drive (28/09/2026). O
container da sessão não tem a chave de serviço do Supabase; o worker do
repositório tem (é o mesmo secret do render-corte). Então o job baixa,
mede, tira a miniatura e grava exatamente como a tela gravaria.

O que ele grava, por clipe:
  - o MP4 em `franqueadas-assets/<franqueada>/outro/<ts>_<slug>.mp4` (mesmo
    caminho e mesmo `tipo` que `uploadArquivo` usa) e a miniatura JPG ao lado;
  - uma linha em `videos_franqueada` (ou `acervo_videos`, com --acervo) com
    título, descrição, tags, duração e dimensões, que a tela do upload NÃO
    preenche (ela só grava título, descrição e tags);
  - uma linha em `arquivos_franqueada` (tipo `outro`), como a tela faz.

🔴 Idempotente por TÍTULO dentro da mesma franqueada: rodar duas vezes não
duplica. Título repetido no manifesto é erro antes de qualquer upload.
🔴 Erro num clipe não derruba os outros: o resumo lista o que falhou e o
processo sai com código 1 no fim.
"""
import argparse, json, os, re, subprocess, sys, tempfile, time, unicodedata
import requests

SB_URL = os.environ.get("SB_URL", "").rstrip("/")
SB_KEY = os.environ.get("SB_KEY", "")
HDR = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}
BUCKET = "franqueadas-assets"
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")


def slug(nome):
    s = unicodedata.normalize("NFD", nome)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]", "_", s)[:40]


def drive_url(drive_id):
    return f"https://drive.usercontent.google.com/download?id={drive_id}&export=download&confirm=t"


def baixar(url, destino):
    with requests.get(url, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(destino, "wb") as f:
            for chunk in r.iter_content(1 << 16):
                f.write(chunk)
    if os.path.getsize(destino) < 10_000:
        raise RuntimeError("arquivo baixado é pequeno demais (Drive devolveu página, não vídeo?)")


def medir(arquivo):
    """Duração (s) e dimensões lidas do próprio ffmpeg; sem chute."""
    out = subprocess.run([FFMPEG, "-i", arquivo], capture_output=True, text=True).stderr
    m = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", out)
    dur = round(int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])) if m else None
    m = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", out)
    w, h = (int(m[1]), int(m[2])) if m else (None, None)
    # Rotação por metadado (vídeo de celular): a dimensão útil é a girada.
    if re.search(r"rotat(e|ion)\s*[:=]\s*-?(90|270)", out) and w and h:
        w, h = h, w
    return dur, w, h


def miniatura(arquivo, destino, dur):
    t = max(0.2, (dur or 2) * 0.4)
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", str(t), "-i", arquivo,
                    "-frames:v", "1", "-vf", "scale='min(720,iw)':-2", destino], check=True)


def subir(path, arquivo, content_type):
    with open(arquivo, "rb") as f:
        r = requests.post(f"{SB_URL}/storage/v1/object/{BUCKET}/{path}",
                          headers={**HDR, "Content-Type": content_type, "x-upsert": "true"}, data=f, timeout=600)
    r.raise_for_status()
    r = requests.post(f"{SB_URL}/storage/v1/object/sign/{BUCKET}/{path}",
                      headers={**HDR, "Content-Type": "application/json"},
                      data=json.dumps({"expiresIn": 31536000}), timeout=60)
    r.raise_for_status()
    return f"{SB_URL}/storage/v1{r.json()['signedURL']}"


def rest_get(table, params):
    r = requests.get(f"{SB_URL}/rest/v1/{table}", headers=HDR, params=params, timeout=60)
    r.raise_for_status()
    return r.json()


def rest_insert(table, row):
    r = requests.post(f"{SB_URL}/rest/v1/{table}",
                      headers={**HDR, "Content-Type": "application/json", "Prefer": "return=representation"},
                      data=json.dumps(row), timeout=60)
    if not r.ok:
        raise RuntimeError(f"{table}: {r.status_code} {r.text[:300]}")
    return r.json()[0]


def ja_existe(tabela, franqueada_id, titulo):
    params = {"select": "id", "titulo": f"eq.{titulo}", "ativo": "eq.true", "limit": "1"}
    if tabela == "videos_franqueada":
        params["franqueada_id"] = f"eq.{franqueada_id}"
    return bool(rest_get(tabela, params))


def processar(clipe, franqueada_id, acervo, dry_run, local_dir, work):
    titulo = clipe["titulo"].strip()
    tabela = "acervo_videos" if acervo else "videos_franqueada"
    if not dry_run and ja_existe(tabela, franqueada_id, titulo):
        return "já existia"

    nome = slug(clipe.get("arquivo") or titulo)
    mp4 = os.path.join(work, f"{nome}.mp4")
    if local_dir:
        origem = os.path.join(local_dir, f"{clipe['arquivo']}.mp4")
        if not os.path.exists(origem):
            raise RuntimeError(f"arquivo local não encontrado: {origem}")
        mp4 = origem
    else:
        baixar(clipe.get("url") or drive_url(clipe["drive_id"]), mp4)

    dur, w, h = medir(mp4)
    if not dur or not w:
        raise RuntimeError("ffmpeg não conseguiu ler duração/dimensão")
    jpg = os.path.join(work, f"{nome}.jpg")
    miniatura(mp4, jpg, dur)
    tamanho = os.path.getsize(mp4)
    if dry_run:
        return f"ok (seco) {dur}s {w}x{h} {tamanho // 1024}KB thumb={os.path.getsize(jpg) // 1024}KB"

    ts = int(time.time() * 1000)
    base = f"{franqueada_id}/outro/{ts}_{nome}"
    url = subir(f"{base}.mp4", mp4, "video/mp4")
    thumb = subir(f"{base}_thumb.jpg", jpg, "image/jpeg")

    linha = {
        "titulo": titulo,
        "descricao": clipe.get("descricao") or None,
        "url": url,
        "thumbnail_url": thumb,
        "duracao_seg": dur,
        "largura_px": w,
        "altura_px": h,
        "tags": clipe.get("tags") or [],
        "fonte": "upload",
    }
    if acervo:
        linha.update({"bucket": BUCKET, "path_storage": f"{base}.mp4",
                      "categoria": clipe.get("categoria")})
    else:
        linha["franqueada_id"] = franqueada_id
    novo = rest_insert(tabela, linha)

    # Mesmo registro que `uploadArquivo` faz pra aparecer em "Meus arquivos".
    rest_insert("arquivos_franqueada", {
        "franqueada_id": franqueada_id, "tipo": "outro",
        "nome_arquivo": f"{clipe.get('arquivo') or nome}.mp4", "url_storage": url,
        "tamanho_bytes": tamanho, "formato": "mp4", "largura_px": w, "altura_px": h,
        "descricao": f"b-roll importado: {titulo}",
    })
    return f"ok id={novo['id']} {dur}s {w}x{h}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--franqueada-id", default="")
    ap.add_argument("--acervo", action="store_true", help="grava em acervo_videos (compartilhado)")
    ap.add_argument("--dry-run", action="store_true", help="mede e tira miniatura, não sobe nada")
    ap.add_argument("--local-dir", default="", help="usa <dir>/<arquivo>.mp4 em vez de baixar")
    a = ap.parse_args()

    with open(a.manifest, encoding="utf-8") as f:
        man = json.load(f)
    franqueada_id = a.franqueada_id or man.get("franqueada_id") or ""
    clipes = man["clipes"]
    titulos = [c["titulo"].strip() for c in clipes]
    if len(set(titulos)) != len(titulos):
        sys.exit("título repetido no manifesto; corrija antes de subir")
    if not a.dry_run and (not SB_URL or not SB_KEY or not franqueada_id):
        sys.exit("faltam SB_URL / SB_KEY / franqueada_id")

    falhas = []
    with tempfile.TemporaryDirectory() as work:
        for i, c in enumerate(clipes, 1):
            try:
                r = processar(c, franqueada_id, a.acervo, a.dry_run, a.local_dir, work)
                print(f"[{i}/{len(clipes)}] {c['titulo']}: {r}", flush=True)
            except Exception as e:  # segue pros outros; o resumo diz o que falhou
                falhas.append((c["titulo"], str(e)[:200]))
                print(f"[{i}/{len(clipes)}] {c['titulo']}: FALHOU {e}", flush=True)
    print(f"\n{len(clipes) - len(falhas)} ok, {len(falhas)} falhas")
    for t, e in falhas:
        print(f"  - {t}: {e}")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
