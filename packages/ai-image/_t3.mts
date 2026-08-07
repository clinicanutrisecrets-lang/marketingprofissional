import sharp from "sharp";
import { renderCard } from "./src/cardDesigner.ts";

const brand = { nomeMarca: "Scanner da Saúde", corPrimariaHex: "#2F5D50" };

// contraste novo nos 3 esquemas
for (let s = 0; s < 3; s++) {
  const buf = await renderCard({
    layout: "hero", dimensoes: "1080x1080", brand, schemeIndex: s,
    conteudo: {
      headline: "A precisão muda tudo na sua prescrição",
      eyebrow: "nutrição de precisão",
      subtitle: "Quando você ajusta forma, dose e timing pela composição real do paciente, a taxa de resposta muda completamente.",
      cta: "disso você já sabe.",
    },
  });
  await sharp(buf).toFile(`/tmp/c2-hero-${s}.png`);
}

// layout foto: simula a foto da IA com um still de comida (gradiente + formas)
const fakeFoto = await sharp({
  create: { width: 1080, height: 700, channels: 3, background: { r: 168, g: 148, b: 120 } },
}).composite([{
  input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="700">
    <rect width="1080" height="700" fill="#A89478"/>
    <circle cx="380" cy="330" r="180" fill="#8A9B6E"/>
    <circle cx="700" cy="400" r="120" fill="#C77B4F"/>
    <ellipse cx="540" cy="560" rx="400" ry="80" fill="#00000022"/>
  </svg>`), top: 0, left: 0,
}]).png().toBuffer();

const comFoto = await renderCard({
  layout: "foto", dimensoes: "1080x1080", brand, schemeIndex: 1, fotoBuffer: fakeFoto,
  conteudo: {
    headline: "Você não está sozinha nessa jornada",
    eyebrow: "acolhimento",
    subtitle: "Muitas nutricionistas enfrentam os mesmos desafios de posicionamento.",
    cta: "que tal mudar isso, juntas?",
  },
});
await sharp(comFoto).toFile("/tmp/c2-foto.png");
console.log("ok");
