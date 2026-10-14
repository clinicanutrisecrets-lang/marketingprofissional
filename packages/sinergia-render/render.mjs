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

// No GitHub Actions o puppeteer é instalado FORA do repo (SINERGIA_DEPS), porque
// o repo é workspace e o npm install dentro dele falha.
const requires = [require]
if (process.env.SINERGIA_DEPS) {
  requires.unshift(createRequire(path.join(process.env.SINERGIA_DEPS, 'package.json')))
}

function puppeteer() {
  for (const req of requires) {
    for (const nome of ['puppeteer-core', 'puppeteer']) {
      try {
        return req(nome)
      } catch {}
    }
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

// Logo com margem vazia (PNG quadrado de 2160 px com a marca numa faixa do
// meio, caso Mariana 14/10/2026) encolhia até sumir no selo da capa. Corta a
// margem transparente ou branca antes de montar os quadros. Falha em qualquer
// passo mantém a logo original: logo pequena é melhor que post sem logo.
if (payload.marca?.logo_url && /^https?:/.test(payload.marca.logo_url)) {
  try {
    const r = await fetch(payload.marca.logo_url)
    if (r.ok) {
      const tipo = r.headers.get('content-type') || 'image/png'
      const dataUri = `data:${tipo};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`
      await page.goto('about:blank')
      const aparada = await page.evaluate(async (src) => {
        const img = new Image()
        img.src = src
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const { data, width: w, height: h } = ctx.getImageData(0, 0, c.width, c.height)
        let x0 = w, y0 = h, x1 = -1, y1 = -1
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4
            const vazio = data[i + 3] < 16 || (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245)
            if (!vazio) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
          }
        }
        if (x1 < 0) return null
        const m = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04)
        x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m)
        x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m)
        if (x1 - x0 > w * 0.9 && y1 - y0 > h * 0.9) return null
        const o = document.createElement('canvas')
        o.width = x1 - x0 + 1
        o.height = y1 - y0 + 1
        o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height)
        return o.toDataURL('image/png')
      }, dataUri)
      if (aparada) payload.marca.logo_url = aparada
    }
  } catch (e) {
    console.warn('logo sem corte de margem:', e.message)
  }
}

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
