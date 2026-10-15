/**
 * Desenha o carrossel da Fábrica da Saúde na marca da profissional
 * (apps/franquias/src/lib/geracao/fabrica.ts). Uso:
 *
 *   node carrossel-fabrica.cjs <molde.html> <spec.json> <pasta-de-saida>
 *
 * spec.json = PersonalizacaoFabrica, com `logo` e `foto` já como CAMINHOS
 * locais (o worker baixa e tira o fundo branco da logo antes). Sai s1.png a
 * s9.png, 1080x1350. Precisa de puppeteer-core (NODE_PATH) e CHROME_PATH.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const [molde, specPath, saida] = process.argv.slice(2);
if (!molde || !specPath || !saida) {
  console.error("uso: carrossel-fabrica.cjs <molde.html> <spec.json> <saida>");
  process.exit(2);
}
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hx = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a, b, t) => hx(a.map((v, i) => v * (1 - t) + b[i] * t));
const luz = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const W = [255, 255, 255];
const K = [0, 0, 0];
// Cor clara demais some como letra sobre o fundo claro: escurece antes.
const legivel = (h) => (luz(rgb(h)) > 0.6 ? mix(rgb(h), K, 0.45) : h.toUpperCase());

const P = rgb(legivel(spec.primaria));
const S = rgb(legivel(spec.secundaria));
const corP = hx(P);

// 1. O molde, com a marca e os textos dela, ANTES de carregar: a página é um
//    pacote do Claude Design que se desempacota sozinho, e as cores moram lá dentro.
let html = fs.readFileSync(molde, "utf8");
const mapa = {
  "#0ABFBC": hx(P), "#089896": hx(P), "#067C7A": mix(P, K, 0.25), "#E6F7F7": mix(P, W, 0.9),
  "#7B5EA7": mix(S, K, 0.15), "#5C4080": mix(S, K, 0.4), "#F1EDF7": mix(S, W, 0.88), "#E7DFF2": mix(S, W, 0.78),
};
for (const [a, b] of Object.entries(mapa)) html = html.replace(new RegExp(a, "gi"), b);
html = html.split("rgba(10,191,188").join(`rgba(${P.join(",")}`).split("rgba(123,94,167").join(`rgba(${S.join(",")}`);

// Os sintomas passam por marcadores: trocar direto deixaria um texto novo
// casar com a busca de um original seguinte.
const originais = ["cansaço que não passa", "intestino preso ou inchado", "fome fora de hora", "sono que não descansa", "peso que não se mexe"];
originais.forEach((o, i) => {
  if (!html.includes(o)) throw new Error(`o molde não tem o sintoma "${o}"`);
  html = html.replace(o, `__SINTOMA_${i}__`);
});
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
(spec.sintomas || []).slice(0, 5).forEach((s, i) => { html = html.replace(`__SINTOMA_${i}__`, esc(s)); });
originais.forEach((o, i) => { html = html.replace(`__SINTOMA_${i}__`, o); });

if (!html.includes("a sua Detetive da Saúde")) throw new Error("o molde não tem o título do último slide");
html = html.replace("a sua Detetive da Saúde", esc(spec.detetive || "Detetive da Saúde"));
html = html.split("@seuperfil").join(esc(spec.handle || ""));

const tmp = path.join(saida, "_molde.html");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(tmp, html);

const dataUri = (p, tipo) => (p && fs.existsSync(p) ? `data:${tipo};base64,${fs.readFileSync(p).toString("base64")}` : null);
const logo = dataUri(spec.logo, "image/png");
const foto = dataUri(spec.foto, "image/jpeg");

(async () => {
  const b = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const pg = await b.newPage();
  const erros = [];
  pg.on("pageerror", (e) => erros.push(e.message));
  await pg.setViewport({ width: 1400, height: 14000 });
  await pg.goto("file://" + path.resolve(tmp));
  await pg.waitForSelector("#s9", { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 4000));

  const r = await pg.evaluate(
    ({ logo, foto, genes, corP, clara }) => {
      const out = { foto: false, genes: false };
      // Foto dela no último slide; sem foto, o espaço do molde fica como está.
      const slot = document.querySelector("#carrossel-foto-profissional");
      if (slot && foto) {
        const im = document.createElement("img");
        im.src = foto;
        im.style.cssText = "width:260px;height:260px;border-radius:50%;object-fit:cover;display:block";
        slot.replaceWith(im);
        out.foto = true;
      }
      // Logo na capa e no último slide (acima do botão "Agende").
      if (logo) {
        for (const id of ["s1", "s9"]) {
          const sl = document.getElementById(id);
          if (!sl) continue;
          const im = document.createElement("img");
          im.src = logo;
          im.style.cssText =
            id === "s1"
              ? "position:absolute;right:90px;top:170px;height:70px;width:auto"
              : "position:absolute;top:900px;left:50%;transform:translateX(-50%);height:110px;width:auto";
          sl.appendChild(im);
        }
      }
      // Slide 8: com a cor dela de fundo, o texto escuro some. Fundo claro, detalhes na cor.
      const s8 = document.getElementById("s8");
      if (s8) {
        const p = corP;
        const toRgb = (h) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
        for (const el of [s8, ...s8.querySelectorAll("*")]) {
          const cs = getComputedStyle(el);
          if (cs.backgroundColor === toRgb(p)) el.style.backgroundColor = clara;
          if (cs.borderBottomColor === "rgb(255, 255, 255)" && parseFloat(cs.borderBottomWidth) > 2) el.style.borderBottomColor = p;
          if (cs.backgroundColor === "rgb(255, 255, 255)" && el.offsetHeight < 20 && el.offsetWidth > 4) el.style.backgroundColor = p;
        }
      }
      // Slide 3: os genes do nicho dela embaixo dos 4 setores.
      const s3 = document.getElementById("s3");
      const g = s3 && [...s3.querySelectorAll("div")].find((d) => getComputedStyle(d).display === "grid");
      if (g && genes && genes.length) {
        g.style.flex = "none";
        g.style.gap = "18px";
        for (const card of g.children) {
          card.style.padding = "22px 26px";
          card.style.gap = "6px";
          const sv = card.querySelector("svg");
          if (sv) { sv.setAttribute("width", "64"); sv.setAttribute("height", "64"); }
          const st = card.querySelector("strong");
          if (st) st.style.fontSize = "38px";
          const pp = card.querySelector("p");
          if (pp) { pp.style.fontSize = "25px"; pp.style.lineHeight = "1.35"; }
        }
        const box = document.createElement("div");
        box.style.cssText = `background:${clara};border-radius:28px;padding:24px 30px;display:flex;flex-direction:column;gap:12px`;
        const titulo = document.createElement("div");
        titulo.style.cssText = `font-size:22px;letter-spacing:3px;font-weight:700;color:${corP}`;
        titulo.textContent = "AS MÁQUINAS QUE EU MAIS OLHO NO MEU ATENDIMENTO";
        box.appendChild(titulo);
        for (const ge of genes) {
          const linha = document.createElement("div");
          linha.style.cssText = "display:flex;align-items:baseline;gap:18px";
          const n = document.createElement("strong");
          n.style.cssText = "font-family:'DM Sans',sans-serif;font-weight:700;font-size:30px;color:#1A1A2E;min-width:150px";
          n.textContent = ge.gene;
          const t = document.createElement("span");
          t.style.cssText = "font-size:26px;line-height:1.3;color:#4A4A6A";
          t.textContent = ge.funcao;
          linha.append(n, t);
          box.appendChild(linha);
        }
        g.after(box);
        out.genes = true;
      }
      return out;
    },
    { logo, foto, genes: spec.genes || [], corP, clara: mix(P, W, 0.9) },
  );
  await new Promise((r) => setTimeout(r, 800));
  for (let i = 1; i <= 9; i++) {
    const el = await pg.$("#s" + i);
    if (!el) throw new Error(`o slide ${i} não apareceu`);
    await el.screenshot({ path: path.join(saida, `s${i}.png`) });
  }
  await b.close();
  fs.unlinkSync(tmp);
  console.log(JSON.stringify({ ...r, erros }));
  if (!r.genes) throw new Error("a faixa dos genes não entrou no slide 3");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
