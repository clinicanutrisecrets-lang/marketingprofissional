// Carrossel de sinergia + trio de stories (Aline, 05/10/2026).
//
// É o MESMO desenho do exemplo aprovado (carrossel da Juliana, 05/10): HTML
// desenhado no Chromium. Recebe o conteúdo já conferido pelo app
// (apps/franquias/src/lib/geracao/sinergia.ts) e a marca da conta.
//
// Função pura: devolve a lista de quadros [nome, html]. Quem desenha é o
// render.mjs.

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const HEX = /^#[0-9a-fA-F]{6}$/

function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** Mistura a cor com um creme quente (fundo claro da marca, como no exemplo aprovado). */
function clarear(hex, t) {
  const n = parseInt(hex.slice(1), 16)
  const creme = [251, 247, 242]
  const m = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (creme[i] - v) * t))
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Escurece a cor (texto sobre fundo claro precisa de contraste). */
function escurecer(hex, t) {
  const n = parseInt(hex.slice(1), 16)
  const m = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - t)))
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Cor da marca legível como texto sobre o fundo claro. */
export function corDeTexto(hex) {
  let c = HEX.test(hex) ? hex : '#2F5D50'
  for (let i = 0; i < 6 && luminancia(c) > 0.22; i++) c = escurecer(c, 0.18)
  return c
}

export function quadros(payload, fontsDir) {
  const { conteudo: r, foto_url: foto, marca: m } = payload
  const cor = corDeTexto(m.cor)
  const cor2 = HEX.test(m.cor2) ? m.cor2 : cor
  const fundo = clarear(HEX.test(m.cor) ? m.cor : '#2F5D50', 0.93)
  const tinta = '#2b211d'
  const nN = r.nutrientes.length
  const total = 4 + nN
  const n2 = (i) => String(i).padStart(2, '0')
  const num = (i) => `${n2(i)}/${n2(total)}`
  const fotoCss = `url("${esc(foto)}")`

  const css = `
@font-face{font-family:PF;src:url(file://${fontsDir}/playfair-display.ttf)}
@font-face{font-family:MS;src:url(file://${fontsDir}/montserrat.ttf)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:MS;color:${tinta}}
.q{width:1080px;height:1350px;position:relative;overflow:hidden;background:${fundo};padding:96px 92px;display:flex;flex-direction:column}
.q.st{height:1920px;padding:130px 92px}
.olho{font-size:22px;letter-spacing:.32em;text-transform:uppercase;color:${cor};font-weight:600}
.num{position:absolute;top:96px;right:92px;font-size:22px;letter-spacing:.2em;color:#8a7d77}
.st .num{top:130px}
h1{font-family:PF;font-weight:500;font-size:84px;line-height:1.08;color:${tinta}}
h2{font-family:PF;font-weight:500;font-size:88px;line-height:1.05}
.onde{font-family:PF;font-size:44px;color:${cor};margin-top:10px;font-style:italic}
p.c{font-size:31px;line-height:1.5;color:#5a4d47;margin-top:34px}
.reg{width:90px;height:3px;background:${cor2};margin:44px 0}
.lin{display:grid;grid-template-columns:220px 1fr;gap:28px;border-top:1px solid #e3d8d2;padding:24px 0;font-size:25px;line-height:1.45}
.lin b{font-size:18px;letter-spacing:.22em;text-transform:uppercase;color:${cor};font-weight:600;padding-top:6px}
.pe{margin-top:auto;font-size:20px;letter-spacing:.3em;text-transform:uppercase;color:#8a7d77}
.logo{height:64px;max-width:320px;object-fit:contain}
.logoPill{position:absolute;top:84px;left:84px;background:rgba(255,255,255,.92);border-radius:40px;padding:14px 26px;font-size:22px;font-weight:600;color:${tinta}}
.logoPill img{height:52px;max-width:280px;object-fit:contain;display:block}
.escuro{background:#1c1714;color:#fff;padding:0}
.escuro .bg{position:absolute;inset:0;background:${fotoCss} center/cover}
.escuro .vel{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,15,12,.15) 30%,rgba(20,15,12,.88) 78%)}
.escuro .in{position:absolute;left:92px;right:92px;bottom:110px}
.escuro .num{color:#fff;opacity:.8}
.escuro h1{color:#fff;font-size:88px}
.escuro .olho{color:#fff;opacity:.85}
.escuro p.c{color:#f1e7e2}
.cta{display:inline-block;margin-top:52px;font-size:22px;letter-spacing:.3em;text-transform:uppercase;color:#fff;opacity:.85}
.fotoTopo{margin:-96px -92px 56px;height:540px;background:${fotoCss} center/cover;position:relative}
.selo{position:absolute;left:52px;bottom:34px;background:#fff;border-radius:40px;padding:12px 26px;font-size:20px;letter-spacing:.16em;text-transform:uppercase;font-weight:600;color:${tinta}}
.ing{display:grid;grid-template-columns:1fr 1fr;gap:10px 40px;font-size:24px;line-height:1.45;margin-top:24px}
.fecho{font-family:PF;font-size:40px;color:${cor};margin-top:auto}
.troca{font-size:30px;padding:24px 0;border-top:1px solid #e3d8d2}
.disc{font-size:19px;color:#8a7d77;margin-top:14px}
.btn{display:inline-block;background:${cor};color:#fff;border-radius:60px;padding:24px 44px;font-size:28px;font-weight:600}
.chip{display:inline-block;border:1.5px solid rgba(255,255,255,.6);border-radius:40px;padding:12px 24px;font-size:20px;letter-spacing:.14em;text-transform:uppercase;margin:8px 10px 0 0}
`
  // Logo no pill; sem logo, o nome da conta escrito.
  const pill = (top) =>
    m.logo_url
      ? `<div class="logoPill"${top ? ` style="top:${top}px"` : ''}><img src="${esc(m.logo_url)}"></div>`
      : m.rodape
        ? `<div class="logoPill"${top ? ` style="top:${top}px"` : ''}>${esc(m.rodape)}</div>`
        : ''
  const assinatura = `<div style="margin-top:28px;display:flex;align-items:center;gap:22px">${
    m.logo_url ? `<img class="logo" src="${esc(m.logo_url)}">` : m.rodape ? `<span style="font-family:PF;font-size:30px">${esc(m.rodape)}</span>` : ''
  }${m.handle ? `<span style="font-size:22px;color:#8a7d77">${esc(m.handle)}</span>` : ''}</div>`

  const f = []
  f.push(['01-capa', `<div class="q escuro"><div class="bg"></div><div class="vel"></div>${pill()}<div class="num">${num(1)}</div>
<div class="in"><div class="olho">${esc(r.trio)}</div><h1 style="margin-top:26px">${esc(r.tema)}</h1>${r.subtitulo ? `<p class="c">${esc(r.subtitulo)}</p>` : ''}<div class="cta">Arraste →</div></div></div>`])
  f.push(['02-sinergia', `<div class="q"><div class="olho">O que é sinergia</div><div class="num">${num(2)}</div>
<h1 style="margin-top:200px">Sinergia é quando um nutriente faz o outro render mais.</h1><div class="reg"></div>
<p class="c" style="margin-top:0">${esc(r.explicacao)}</p><div class="pe">Arraste e veja nutriente por nutriente</div></div>`])
  r.nutrientes.forEach((n, i) => {
    f.push([`${n2(3 + i)}-nutriente`, `<div class="q"><div class="olho">Nutriente ${i + 1} de ${nN}</div><div class="num">${num(3 + i)}</div>
<h2 style="margin-top:100px">${esc(n.nome)}</h2>${n.onde ? `<div class="onde">${esc(n.onde)}</div>` : ''}<p class="c">${esc(n.texto)}</p>
<div style="margin-top:40px">${n.linhas.map(([k, v]) => `<div class="lin"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div>
<div class="pe">Um prato, ${nN} frentes</div></div>`])
  })
  f.push([`${n2(3 + nN)}-receita`, `<div class="q"><div class="fotoTopo">${r.tempo ? `<div class="selo">${esc(r.tempo)}</div>` : ''}</div>
<div style="display:flex;justify-content:space-between;align-items:baseline"><div class="olho">A receita</div><div style="font-size:22px;letter-spacing:.2em;color:#8a7d77">${num(3 + nN)}</div></div>
<h1 style="font-size:56px;margin-top:16px">${esc(r.titulo_receita)}</h1><div style="margin:26px 0 4px;width:100%;height:1px;background:#e3d8d2"></div>
<div class="ing">${r.ingredientes.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
<p class="c" style="font-size:25px;margin-top:26px">${esc(r.passos.join(' '))}</p>
<div class="fecho">${esc(r.fecho)}</div></div>`])
  f.push([`${n2(4 + nN)}-salve`, `<div class="q"><div class="olho">Leve para a semana</div><div class="num">${num(4 + nN)}</div>
<h1 style="margin-top:150px">Salve para fazer esta semana.</h1><div class="reg"></div>
${r.trocas.length ? `<div class="olho" style="font-size:19px;color:#8a7d77;margin-bottom:10px">Trocas que funcionam igual</div>${r.trocas.map((t) => `<div class="troca">${esc(t)}</div>`).join('')}` : ''}
<div style="margin-top:auto;border-top:1px solid #e3d8d2;padding-top:30px"><div style="font-family:PF;font-size:38px">Compartilhe com quem cuida da própria saúde.</div>
<div class="disc">Conteúdo informativo. Não substitui acompanhamento profissional.</div>${assinatura}</div></div>`])

  f.push(['story-01', `<div class="q st escuro"><div class="bg"></div><div class="vel" style="background:linear-gradient(180deg,rgba(20,15,12,.25),rgba(20,15,12,.85) 60%)"></div>${pill(120)}<div class="num">01/03</div>
<div class="in" style="bottom:200px"><div class="olho">Os ingredientes da sinergia</div><h1 style="margin:22px 0 40px">${nN === 3 ? 'Três' : nN} nutrientes, um prato.</h1>
${r.nutrientes.map((n) => `<div style="display:flex;justify-content:space-between;gap:24px;border-top:1px solid rgba(255,255,255,.3);padding:26px 0;font-size:34px"><span style="font-family:PF">${esc(n.nome)}</span><span style="font-size:20px;letter-spacing:.2em;text-transform:uppercase;opacity:.85;padding-top:10px;text-align:right">${esc(n.onde)}</span></div>`).join('')}
<div class="btn" style="margin-top:50px">Veja a postagem no feed →</div></div></div>`])
  f.push(['story-02', `<div class="q st"><div class="fotoTopo" style="margin:-130px -92px 70px;height:820px">${r.tempo ? `<div class="selo">${esc(r.tempo)}</div>` : ''}</div>
<div class="num" style="top:900px">02/03</div><div class="olho">O preparo</div><h1 style="margin:22px 0 30px">Pronto em ${r.passos.length} passos.</h1>
${r.passos.map((p, i) => `<div class="troca" style="display:flex;gap:26px"><b style="font-family:PF;color:${cor};font-size:38px">${n2(i + 1)}</b><span>${esc(p)}</span></div>`).join('')}
<div style="margin-top:auto"><div class="btn">Veja a postagem no feed →</div></div></div>`])
  f.push(['story-03', `<div class="q st escuro"><div class="bg"></div><div class="vel" style="background:linear-gradient(180deg,rgba(20,15,12,.15),rgba(20,15,12,.85) 65%)"></div>${pill(120)}<div class="num">03/03</div>
<div class="in" style="bottom:200px"><div class="olho">O prato final</div><h1 style="margin:22px 0 18px">Do preparo à mesa.</h1><p class="c" style="margin-top:0">${esc(r.titulo_receita)}</p>
<div style="margin-top:24px">${r.nutrientes.map((n) => `<span class="chip">${esc(n.nome)}</span>`).join('')}</div>
<div class="btn" style="margin-top:50px">Veja a postagem no feed →</div></div></div>`])

  return f.map(([nome, html]) => [nome, `<!doctype html><meta charset=utf-8><style>${css}</style>${html}`])
}
