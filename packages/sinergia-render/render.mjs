// Desenha o carrossel de sinergia e o trio de stories.
//
//   node packages/sinergia-render/render.mjs payload.json saida/
//
// Saída: os JPG dos quadros (carrossel 1080x1350, stories 1080x1920) e
// `saida/manifesto.json` com a ordem. O Chromium vem de CHROME_PATH (no
// GitHub Actions o runner ubuntu já tem o google-chrome).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { quadros } from './template.mjs'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

function puppeteer() {
  for (const nome of ['puppeteer-core', 'puppeteer']) {
    try {
      return require(nome)
    } catch {}
  }
  throw new Error('instale puppeteer-core')
}

const [, , arqPayload, saida] = process.argv
if (!arqPayload || !saida) {
  console.error('uso: render.mjs payload.json saida/')
  process.exit(2)
}
const payload = JSON.parse(fs.readFileSync(arqPayload, 'utf8'))
fs.mkdirSync(saida, { recursive: true })

// A foto do prato é fundo (CSS), fora de document.images: confere antes.
if (/^https?:/.test(payload.foto_url)) {
  const r = await fetch(payload.foto_url, { method: 'HEAD' })
  if (!r.ok) throw new Error(`foto do prato não abriu (${r.status}): ${payload.foto_url}`)
}

const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome'
const browser = await puppeteer().launch({
  executablePath: chrome,
  args: ['--no-sandbox', '--allow-file-access-from-files'],
})
const page = await browser.newPage()
const tmp = path.join(saida, '_quadro.html')
const feitos = []
try {
  for (const [nome, html] of quadros(payload, path.join(DIR, 'fonts'))) {
    const story = nome.startsWith('story')
    await page.setViewport({ width: 1080, height: story ? 1920 : 1350 })
    fs.writeFileSync(tmp, html)
    await page.goto(`file://${path.resolve(tmp)}`, { waitUntil: 'networkidle0', timeout: 60_000 })
    await page.evaluate(() => document.fonts.ready)
    // 🔴 Foto ou logo que não carregou é falha, não quadro vazio: o post
    // sairia com o fundo marrom no lugar do prato.
    const quebradas = await page.evaluate(() => {
      const imgs = [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src)
      return imgs
    })
    if (quebradas.length) throw new Error(`imagem não carregou em ${nome}: ${quebradas.join(', ')}`)
    const arq = path.join(saida, `${nome}.jpg`)
    await page.screenshot({ path: arq, type: 'jpeg', quality: 90 })
    feitos.push({ nome, arquivo: `${nome}.jpg`, story })
  }
} finally {
  await browser.close()
  fs.rmSync(tmp, { force: true })
}
fs.writeFileSync(path.join(saida, 'manifesto.json'), JSON.stringify(feitos, null, 1))
console.log(`ok: ${feitos.length} quadros`)
