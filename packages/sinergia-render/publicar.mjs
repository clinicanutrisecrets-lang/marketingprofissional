// Sobe os quadros desenhados pro Storage e liga cada um ao seu post.
//
//   node publicar.mjs payload.json saida/            → sobe e liga
//   node publicar.mjs payload.json saida/ --falhou   → apaga os posts vazios
//
// 🔴 Se o desenho falhou, os 4 cards (carrossel + 3 stories) saem do pacote:
// card de carrossel sem slide nenhum confunde mais do que ajuda, e o resto da
// semana segue intacto.
import fs from 'node:fs'
import path from 'node:path'

const [, , arqPayload, saida, flag] = process.argv
const SB = process.env.SB_URL
const KEY = process.env.SB_KEY
if (!SB || !KEY) throw new Error('faltam SB_URL e SB_KEY')
const payload = JSON.parse(fs.readFileSync(arqPayload, 'utf8'))
const ids = [payload.carrossel_post_id, ...(payload.story_post_ids ?? [])].filter(Boolean)
const auth = { Authorization: `Bearer ${KEY}`, apikey: KEY }
const BUCKET = 'franqueadas-assets'

async function ok(res, oque) {
  if (!res.ok) throw new Error(`${oque}: ${res.status} ${(await res.text()).slice(0, 200)}`)
  return res
}

if (flag === '--falhou') {
  if (ids.length) {
    await ok(
      await fetch(`${SB}/rest/v1/posts_agendados?id=in.(${ids.join(',')})`, { method: 'DELETE', headers: auth }),
      'apagar posts',
    )
    console.log(`apagados ${ids.length} cards sem arte`)
  }
  process.exit(0)
}

const manifesto = JSON.parse(fs.readFileSync(path.join(saida, 'manifesto.json'), 'utf8'))

async function subir(arquivo) {
  const destino = `${payload.destino}/${arquivo}`
  await ok(
    await fetch(`${SB}/storage/v1/object/${BUCKET}/${destino}`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body: fs.readFileSync(path.join(saida, arquivo)),
    }),
    `upload ${arquivo}`,
  )
  const r = await ok(
    await fetch(`${SB}/storage/v1/object/sign/${BUCKET}/${destino}`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 31536000 }),
    }),
    `assinar ${arquivo}`,
  )
  const { signedURL } = await r.json()
  return `${SB}/storage/v1${signedURL}`
}

async function patch(id, corpo) {
  await ok(
    await fetch(`${SB}/rest/v1/posts_agendados?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(corpo),
    }),
    `ligar post ${id}`,
  )
}

const slides = []
for (const q of manifesto.filter((x) => !x.story)) slides.push(await subir(q.arquivo))
const stories = []
for (const q of manifesto.filter((x) => x.story)) stories.push(await subir(q.arquivo))

// Carrossel: todos os slides na ordem; o 1º também em url_imagem_final (quem
// só lê esse campo segue igual).
await patch(payload.carrossel_post_id, { urls_slides: slides, url_imagem_final: slides[0] })
for (let i = 0; i < (payload.story_post_ids ?? []).length; i++) {
  if (stories[i]) await patch(payload.story_post_ids[i], { url_imagem_final: stories[i] })
}
console.log(`ok: ${slides.length} slides e ${stories.length} stories ligados`)
