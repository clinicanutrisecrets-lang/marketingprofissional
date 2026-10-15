/**
 * Vídeo de marca: abre o molde do Claude Design num Chromium sem tela, com a
 * cor e a logo da profissional no endereço, avança a animação quadro a quadro
 * e entrega os quadros ao ffmpeg, que monta o MP4 9:16.
 *
 * Uso:
 *   node render.cjs <url-do-molde-com-parametros> <saida.mp4> [--fps 30]
 *   node render.cjs <url> <saida.jpg> --poster <segundo>
 *
 * 🔴 O molde é avançado pelo evento do próprio player do Claude Design
 * ('data-om-seek-to-time-frame' com sync:true): cada quadro é desenhado no
 * instante pedido, nunca pelo relógio. Sem isso o vídeo sai com saltos.
 * 🔴 Os quadros vão direto pro ffmpeg pela entrada padrão: gravar 3.500 PNG
 * em disco passa de 5 GB.
 */
const { spawn } = require("node:child_process");
const puppeteer = require("puppeteer-core");

const [, , url, saida, ...resto] = process.argv;
const opt = (nome, padrao) => {
  const i = resto.indexOf(nome);
  return i >= 0 ? resto[i + 1] : padrao;
};
const FPS = Number(opt("--fps", "30"));
const POSTER = opt("--poster", null);
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const SELETOR = "[data-om-exportable-video-with-duration-secs]";

(async () => {
  const navegador = await puppeteer.launch({ executablePath: CHROME, args: ["--no-sandbox", "--hide-scrollbars"] });
  const pagina = await navegador.newPage();
  // O palco ocupa 1056 px de largura numa janela de 1080: a escala leva o
  // quadro capturado a 1080 x 1920.
  await pagina.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1080 / 1056 });
  const erros = [];
  pagina.on("pageerror", (e) => erros.push(e.message));
  await pagina.goto(url, { waitUntil: "networkidle0", timeout: 120000 });
  await pagina.waitForSelector(SELETOR, { timeout: 120000 }).catch(() => {
    throw new Error(`o molde não abriu: ${erros.join(" | ") || "sem erro na página"}`);
  });
  await pagina.evaluate(() => document.fonts.ready);
  const duracao = await pagina.$eval(SELETOR, (el) => Number(el.getAttribute("data-om-exportable-video-with-duration-secs")));
  if (!(duracao > 0)) throw new Error("o molde não informou a duração");
  const palco = await pagina.$(SELETOR);

  const irPara = async (t) => {
    await pagina.evaluate(
      (s, t) => {
        document.querySelector(s).dispatchEvent(
          new CustomEvent("data-om-seek-to-time-frame", { detail: { time: t, sync: true, playing: false } }),
        );
      },
      SELETOR,
      t,
    );
    await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  };

  if (POSTER !== null) {
    await irPara(Number(POSTER));
    await palco.screenshot({ path: saida, type: "jpeg", quality: 85 });
    await navegador.close();
    return;
  }

  const ff = spawn(
    process.env.FFMPEG || "ffmpeg",
    [
      "-y", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
      "-vf", "scale=1080:1920:flags=lanczos,format=yuv420p",
      "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-movflags", "+faststart",
      saida,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const fim = new Promise((ok, falha) => ff.on("close", (c) => (c === 0 ? ok() : falha(new Error(`ffmpeg saiu com ${c}`)))));

  const total = Math.floor(duracao * FPS);
  for (let i = 0; i < total; i++) {
    await irPara(i / FPS);
    const quadro = await palco.screenshot({ type: "png" });
    if (!ff.stdin.write(quadro)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % (FPS * 10) === 0) console.log(`quadro ${i} de ${total}`);
  }
  ff.stdin.end();
  await fim;
  await navegador.close();
  if (erros.length) console.log("avisos da página:", erros.join(" | "));
  console.log(`pronto: ${total} quadros, ${duracao}s`);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
