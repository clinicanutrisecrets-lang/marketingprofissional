import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { REGRA_SEM_TRAVESSAO } from "@/lib/claude/client";
import { semTravessoesFundo } from "@/lib/texto/sem-travessoes";

export type RoteiroVideoInput = {
  franqueada: {
    nome_completo: string;
    nicho_principal: string;
    publico_alvo_descricao: string;
    historia_pessoal?: string;
    diferenciais?: string;
    cidade?: string;
  };
  anuncio: {
    tema_criativo: string;
    objetivo_negocio: string;
    copy_headline?: string;
    copy_texto?: string;
  };
};

export type RoteiroVideo = {
  duracao_segundos: number;
  formato: "reels_15s" | "reels_30s" | "video_60s";
  hook: string;
  desenvolvimento: string[];
  cta_final: string;
  dicas_gravacao: string[];
  legenda_sugerida: string;
};

export type RoteiroVideoResult = {
  ok: boolean;
  roteiro?: RoteiroVideo;
  erro?: string;
};

const SYSTEM_PROMPT = `
Você é roteirista especializado em vídeos de performance para Meta Ads no nicho de saúde/nutrição no Brasil.

Seu trabalho: criar roteiros de vídeo CURTOS, diretos, com hook poderoso nos primeiros 3 segundos.

REGRAS DE FORMATO:
- Reels 15s: hook (0-3s) + desenvolvimento rápido (3-12s) + CTA (12-15s)
- Reels 30s: hook (0-3s) + 3-4 pontos rápidos (3-25s) + CTA (25-30s)
- Vídeo 60s: hook (0-5s) + história/desenvolvimento (5-50s) + CTA (50-60s)

HOOKS POR NICHO (adapte sempre ao nicho da nutri):
- Nutrição infantil: "Seu filho rejeita comida saudável? Isso tem solução..."
- Nutrição esportiva: "Você treina todos os dias mas não consegue resultado?"
- Nutrição oncológica: "Alimentação durante o tratamento pode mudar tudo..."
- Gestante/maternidade: "Sua alimentação na gravidez afeta o bebê por anos..."
- Emagrecimento: "Parei de fazer dieta e emagreci mais — vou te explicar..."
- Longevidade: "Depois dos 50, o que você come decide sua qualidade de vida"
- Geral/funcional: "Você trata o sintoma ou a causa?"

COMPLIANCE CFN OBRIGATÓRIO:
- Proibido prometer cura ou resultado específico ("emagreça X kg")
- Proibido "antes e depois" com prazo
- Proibido "milagroso", "definitivo", "100% garantido"
- Permitido: "pode ajudar", "contribui para", "muitos pacientes relatam"
- Sempre sugerir avaliação individualizada

DICAS DE GRAVAÇÃO OBRIGATÓRIAS:
- Mencione iluminação (anel de luz ou luz natural)
- Mencione fundo (fundo limpo ou consultório)
- Mencione energia/postura (falar com energia, olhar na câmera)
- Mencione roupas profissionais mas acessíveis

${REGRA_SEM_TRAVESSAO}

Saída: APENAS JSON válido conforme o schema pedido.
`.trim();

export async function gerarRoteiroVideo(params: RoteiroVideoInput): Promise<RoteiroVideoResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const userMsg = `
Nutri: ${params.franqueada.nome_completo}
Nicho: ${params.franqueada.nicho_principal}
Público-alvo: ${params.franqueada.publico_alvo_descricao}
${params.franqueada.historia_pessoal ? `História pessoal: ${params.franqueada.historia_pessoal}` : ""}
${params.franqueada.diferenciais ? `Diferenciais: ${params.franqueada.diferenciais}` : ""}
${params.franqueada.cidade ? `Cidade: ${params.franqueada.cidade}` : ""}

Campanha: ${params.anuncio.tema_criativo}
Objetivo: ${params.anuncio.objetivo_negocio}
${params.anuncio.copy_headline ? `Headline: ${params.anuncio.copy_headline}` : ""}
${params.anuncio.copy_texto ? `Texto: ${params.anuncio.copy_texto}` : ""}

Gere um roteiro de vídeo para Meta Ads. Escolha o formato mais adequado para o objetivo.

Retorne JSON com este schema:
{
  "duracao_segundos": 30,
  "formato": "reels_30s",
  "hook": "texto do hook (primeiros 3 segundos que param o scroll)",
  "desenvolvimento": ["ponto 1", "ponto 2", "ponto 3"],
  "cta_final": "texto do call to action final",
  "dicas_gravacao": ["dica 1", "dica 2", "dica 3", "dica 4"],
  "legenda_sugerida": "legenda completa pro vídeo no Instagram/Facebook"
}
`.trim();

  try {
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    });

    const block = resp.content[0];
    if (!block || block.type !== "text") return { ok: false, erro: "Resposta inesperada da IA" };

    const jsonLimpo = block.text
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    const roteiro = semTravessoesFundo(JSON.parse(jsonLimpo) as RoteiroVideo);
    return { ok: true, roteiro };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}
