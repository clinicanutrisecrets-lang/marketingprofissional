# -*- coding: utf-8 -*-
"""Sincroniza a pasta receitas-fotos/ do repositório com o Supabase.

Para cada imagem (jpg/png/webp), o nome do arquivo vira o título:
  torta-de-cacau-com-abacate.jpg -> "Torta de cacau com abacate"

Sobe o arquivo pro bucket `franqueadas-assets` em `_receitas/<slug>.<ext>`
e faz upsert na tabela biblioteca_receitas.

Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE
"""
import os, sys, json, mimetypes, urllib.request, unicodedata

BASE = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE"]
PASTA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "receitas-fotos")
BUCKET = "franqueadas-assets"

def req(method, url, data=None, headers=None):
    h = {"Authorization": f"Bearer {KEY}", "apikey": KEY}
    if headers:
        h.update(headers)
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def slugify(nome):
    s = unicodedata.normalize("NFD", nome).encode("ascii", "ignore").decode()
    return "".join(c if c.isalnum() or c == "-" else "-" for c in s.lower()).strip("-")

def titulo_de(slug):
    return slug.replace("-", " ").strip().capitalize()

def main():
    if not os.path.isdir(PASTA):
        print("pasta receitas-fotos/ não existe — nada a sincronizar")
        return
    arquivos = [f for f in sorted(os.listdir(PASTA))
                if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
    print(f"{len(arquivos)} fotos encontradas")
    for nome in arquivos:
        raiz, ext = os.path.splitext(nome)
        slug = slugify(raiz)
        path = f"_receitas/{slug}{ext.lower()}"
        ctype = mimetypes.guess_type(nome)[0] or "image/jpeg"
        with open(os.path.join(PASTA, nome), "rb") as f:
            corpo = f.read()
        # upload (upsert)
        st, resp = req("POST", f"{BASE}/storage/v1/object/{BUCKET}/{path}",
                       data=corpo, headers={"Content-Type": ctype, "x-upsert": "true"})
        if st not in (200, 201):
            print(f"ERRO upload {nome}: {st} {resp[:120]}")
            continue
        # URL assinada de longa duração
        st, resp = req("POST", f"{BASE}/storage/v1/object/sign/{BUCKET}/{path}",
                       data=json.dumps({"expiresIn": 10 * 365 * 24 * 3600}).encode(),
                       headers={"Content-Type": "application/json"})
        url = path
        if st == 200:
            url = BASE + "/storage/v1" + json.loads(resp)["signedURL"]
        # upsert na tabela
        st, resp = req("POST", f"{BASE}/rest/v1/biblioteca_receitas?on_conflict=slug",
                       data=json.dumps({"slug": slug, "titulo": titulo_de(slug),
                                        "url": url, "path": path}).encode(),
                       headers={"Content-Type": "application/json",
                                "Prefer": "resolution=merge-duplicates"})
        print(f"{'ok ' if st in (200, 201) else 'ERRO'} {slug} ({st})")

if __name__ == "__main__":
    main()
