# -*- coding: utf-8 -*-
"""
Worker do "corte com IA" (roda no GitHub Actions, ver
.github/workflows/render-corte.yml).

  1. lê a linha em `cortes_ia` e baixa a gravação bruta (bucket videos-biblioteca)
  2. transcreve local (faster-whisper) com timestamp por palavra
  3. pede o PLANO pro Claude: capa, palavra-chave por trecho, b-roll da
     biblioteca (videos_franqueada) e correções de termos técnicos
  4. renderiza (render.py) e sobe o MP4 pro bucket franqueadas-assets
  5. marca `pronto` (ou `erro`, com a mensagem) na tabela

Env: SB_URL, SB_KEY (service role), ANTHROPIC_API_KEY.
Uso: python3 pipeline.py --corte-id <uuid> [--broll-franqueada-id <uuid>]
"""
import argparse, json, os, re, sys, tempfile, time, traceback
import requests
import anthropic

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render  # noqa: E402

SB_URL = os.environ["SB_URL"].rstrip("/")
SB_KEY = os.environ["SB_KEY"]
MODEL = "claude-opus-5"
BUCKET_ORIGEM = "videos-biblioteca"
BUCKET_SAIDA = "franqueadas-assets"
HDR = {"Authorization": f"Bearer {SB_KEY}", "apikey": SB_KEY}


# ---------------------------------------------------------------- supabase
def rest_get(table, params):
    r = requests.get(f"{SB_URL}/rest/v1/{table}", headers=HDR, params=params, timeout=60)
    r.raise_for_status()
    return r.json()


def patch(corte_id, **campos):
    campos["atualizado_em"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    r = requests.patch(f"{SB_URL}/rest/v1/cortes_ia", headers={**HDR, "Content-Type": "application/json", "Prefer": "return=minimal"},
                       params={"id": f"eq.{corte_id}"}, data=json.dumps(campos), timeout=60)
    r.raise_for_status()


def baixar_objeto(bucket, path, destino):
    with requests.get(f"{SB_URL}/storage/v1/object/{bucket}/{path}", headers=HDR, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(destino, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)


def baixar_url(url, destino):
    with requests.get(url, headers=HDR if SB_URL in url else {}, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(destino, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)


def subir_mp4(path, arquivo):
    with open(arquivo, "rb") as f:
        r = requests.post(f"{SB_URL}/storage/v1/object/{BUCKET_SAIDA}/{path}",
                          headers={**HDR, "Content-Type": "video/mp4", "x-upsert": "true"}, data=f, timeout=600)
    r.raise_for_status()
    r = requests.post(f"{SB_URL}/storage/v1/object/sign/{BUCKET_SAIDA}/{path}",
                      headers={**HDR, "Content-Type": "application/json"}, data=json.dumps({"expiresIn": 31536000}), timeout=60)
    r.raise_for_status()
    return f"{SB_URL}/storage/v1{r.json()['signedURL']}"


# ---------------------------------------------------------------- etapas
def normalizar(entrada, saida):
    """MediaRecorder gera webm sem duração e com fps variável; ffmpeg fica
    mais previsível com um MP4 limpo de fps fixo."""
    render.run(["ffmpeg", "-hide_banner", "-y", "-i", entrada, "-r", "25", "-c:v", "libx264", "-preset", "veryfast",
                "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-b:a", "160k",
                "-movflags", "+faststart", saida])


def transcrever(video, wav):
    from faster_whisper import WhisperModel
    render.run(["ffmpeg", "-hide_banner", "-y", "-i", video, "-vn", "-ac", "1", "-ar", "16000", wav])
    m = WhisperModel(os.environ.get("WHISPER_MODEL", "small"), device="cpu", compute_type="int8")
    segs, _ = m.transcribe(wav, language="pt", word_timestamps=True, vad_filter=True)
    out = []
    for s in segs:
        out.append({"inicio": round(s.start, 2), "fim": round(s.end, 2), "texto": s.text.strip(),
                    "palavras": [{"t": w.word.strip(), "i": round(w.start, 2), "f": round(w.end, 2)} for w in (s.words or []) if w.word.strip()]})
    return out


SYSTEM_PLANO = """Você é o editor de vídeo de uma plataforma de marketing para profissionais de saúde integrativa (nutricionistas, médicos etc.). Recebe a transcrição de uma gravação curta (até 60 s) e devolve o PLANO DE EDIÇÃO em JSON. Saída: APENAS JSON válido, sem markdown, sem comentários.

FORMATO EXATO:
{
 "capa": {"linha1": "ASSUNTO", "linha2": "complemento", "apoio": "frase curta de apoio"},
 "secoes": [{"inicio": 0.0, "fim": 9.5, "palavra_chave": "BUTIRATO"}],
 "broll": [{"inicio": 9.0, "fim": 14.0, "video_id": "<id do catálogo>", "motivo": "por quê combina"}],
 "correcoes": [{"de": "rosburia", "para": "Roseburia"}]
}

REGRAS:
- capa.linha1: o assunto em até 14 caracteres (1 ou 2 palavras, vira o título gigante). capa.linha2: até 18 caracteres. capa.apoio: até 48 caracteres, sem ponto final. Nada de promessa de resultado ou cura (CFN): linguagem de investigação.
- secoes: cobrem o vídeo inteiro, de 0 até a duração, sem buracos e sem sobreposição. Entre 4 e 7 seções, cada uma com 5 a 15 segundos e uma palavra_chave de até 12 caracteres (1 palavra, no máximo 2) que resume o que está sendo dito naquele trecho. Corte as seções onde a fala muda de assunto, nunca no meio de uma frase.
- broll: só ids que existem no catálogo recebido. Cada corte tem 3 a 6 segundos, nunca começa antes de 3.0 s, nunca invade os últimos 4 s (é onde fica a chamada pra ação), e entre dois cortes ficam ao menos 3 s de rosto. Total de b-roll no máximo 40% da duração. Escolha o clipe cujo conteúdo visual ilustra o que está sendo dito naquele momento (use titulo, descricao e tags). Se nada combinar de verdade, devolva lista vazia: b-roll ruim é pior que nenhum.
- correcoes: só erros claros do reconhecimento de voz em termos técnicos (nomes de bactérias, genes, exames, nutrientes). "de" é a palavra exatamente como aparece na transcrição, "para" é a grafia correta. Nunca mude a fala em si.
- Português do Brasil. Sem travessão em nenhum texto: use vírgula ou ponto."""


def planejar(transcricao, catalogo, tema, nicho, dur):
    client = anthropic.Anthropic()
    frases = [{"inicio": s["inicio"], "fim": s["fim"], "texto": s["texto"]} for s in transcricao]
    entrada = {"tema": tema, "nicho": nicho, "duracao_seg": dur, "frases": frases,
               "catalogo_broll": [{"id": c["id"], "titulo": c.get("titulo"), "descricao": c.get("descricao"),
                                   "tags": c.get("tags"), "duracao_seg": c.get("duracao_seg")} for c in catalogo]}
    msg = client.messages.create(
        model=MODEL, max_tokens=4000, system=SYSTEM_PLANO,
        messages=[{"role": "user", "content": json.dumps(entrada, ensure_ascii=False)}],
    )
    if msg.stop_reason == "refusal":
        raise RuntimeError("o modelo recusou planejar este vídeo")
    texto = "".join(b.text for b in msg.content if b.type == "text")
    m = re.search(r"\{[\s\S]*\}", texto)
    if not m:
        raise RuntimeError("plano sem JSON")
    plano = json.loads(m.group(0))
    ids = {str(c["id"]) for c in catalogo}
    plano["broll"] = [b for b in plano.get("broll") or [] if str(b.get("video_id")) in ids]
    return plano


def catalogo_broll(franqueada_id, compartilhada_id):
    """Biblioteca da franqueada + acervo compartilhado (acervo_videos).

    O acervo é o catálogo curado que serve aos dois produtos; a biblioteca
    dela vem primeiro na lista porque, empatando a descrição, o agente tende
    a escolher o que aparece antes.
    """
    ids = [franqueada_id] + ([compartilhada_id] if compartilhada_id and compartilhada_id != franqueada_id else [])
    campos = "id,titulo,descricao,tags,duracao_seg,url,largura_px,altura_px"
    rows = rest_get("videos_franqueada", {
        "select": campos, "ativo": "eq.true",
        "franqueada_id": f"in.({','.join(ids)})", "limit": "300"})
    try:
        rows += rest_get("acervo_videos", {"select": campos, "ativo": "eq.true", "limit": "300"})
    except Exception as e:  # acervo é complemento: sem ele o corte ainda sai
        print("acervo indisponível:", e)
    return [r for r in rows if r.get("url")]


# ---------------------------------------------------------------- main
def processar(corte_id, broll_franqueada_id):
    patch(corte_id, status="processando", etapa="transcrevendo", erro_msg=None)
    row = rest_get("cortes_ia", {"id": f"eq.{corte_id}", "select": "*"})[0]
    fr = rest_get("franqueadas", {"id": f"eq.{row['franqueada_id']}", "select": "instagram_handle,nome_completo,nicho_principal"})[0]
    handle = fr.get("instagram_handle") or ""
    handle = handle if not handle or handle.startswith("@") else f"@{handle}"
    handle = handle or "@scannerdasaude"

    work = tempfile.mkdtemp(prefix="corte-")
    bruto = os.path.join(work, "bruto" + os.path.splitext(row["origem_path"])[1])
    limpo = os.path.join(work, "in.mp4")
    baixar_objeto(BUCKET_ORIGEM, row["origem_path"], bruto)
    normalizar(bruto, limpo)
    _, _, dur = render.probe(limpo)

    transcricao = transcrever(limpo, os.path.join(work, "audio.wav"))
    if not any(s["palavras"] for s in transcricao):
        raise RuntimeError("não encontrei fala no vídeo. Confere se o microfone gravou.")
    patch(corte_id, transcricao=transcricao, etapa="planejando")

    catalogo = catalogo_broll(row["franqueada_id"], broll_franqueada_id)
    plano = planejar(transcricao, catalogo, row["tema"], fr.get("nicho_principal"), round(dur, 1))
    patch(corte_id, plano=plano, etapa="renderizando")

    broll_dir = os.path.join(work, "broll"); os.makedirs(broll_dir, exist_ok=True)
    por_id = {str(c["id"]): c for c in catalogo}
    arquivos = {}
    for b in plano.get("broll") or []:
        vid = str(b["video_id"])
        if vid in arquivos:
            continue
        dest = os.path.join(broll_dir, f"{vid}.mp4")
        try:
            baixar_url(por_id[vid]["url"], dest)
            arquivos[vid] = dest
        except Exception as e:  # b-roll que não baixa só sai do plano
            print("b-roll ignorado", vid, e)

    saida = os.path.join(work, "corte.mp4")
    info = render.render(limpo, transcricao, plano, arquivos, handle, "Scanner da Saúde", saida,
                         os.path.join(work, "fonts"))
    path = f"{row['franqueada_id']}/cortes/{corte_id}.mp4"
    url = subir_mp4(path, saida)
    patch(corte_id, status="pronto", etapa=None, path=path, url=url, duracao_seg=info["duracao"])
    print("pronto", path, info)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--corte-id", required=True)
    ap.add_argument("--broll-franqueada-id", default="")
    a = ap.parse_args()
    try:
        processar(a.corte_id, a.broll_franqueada_id.strip())
    except Exception as e:
        traceback.print_exc()
        msg = str(e)[:300]
        try:
            patch(a.corte_id, status="erro", etapa=None, erro_msg=msg)
        except Exception:
            pass
        sys.exit(1)


if __name__ == "__main__":
    main()
