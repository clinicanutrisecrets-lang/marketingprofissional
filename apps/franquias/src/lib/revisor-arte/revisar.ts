import "server-only";
import type { BrandGuidelines, ConteudoPeca, EstiloCapa } from "@scanner/ai-image";
import type { createAdminClient } from "@/lib/supabase/server";
import { CLAUDE_MODEL_AGENTES } from "@/lib/claude/client";
import { logarCusto } from "@/lib/custos/log";
import { gerarCarrosselEUpload, gerarEUploadImagem } from "@/lib/ai-image/render";
import type { ContextoRevisao } from "@/lib/claude/revisor-copy";
import { olharArte } from "./olhar";
import {
  achadosDoOlhar,
  achadosMecanicos,
  decidirAcao,
  resumoAchados,
  type AcaoRevisor,
  type AchadoRevisao,
  type OlharArte,
} from "./regras";

type Admin = ReturnType<typeof createAdminClient>;

export type ResultadoRevisaoArte = {
  urlImagem: string | null;
  urlsSlides: string[] | null;
  acao: AcaoRevisor;
  achados: AchadoRevisao[];
  olhar: OlharArte | null;
  /** A arte que saiu do desenho, quando o revisor a trocou. */
  urlAntes: string | null;
};

/**
 * O revisor da arte, entre o desenho e a gravação do post (ou seja, antes de
 * a profissional ver). Ver regras.ts para o porquê.
 *
 * 🔴 Nunca derruba o pacote: qualquer falha aqui devolve a arte como saiu.
 * Desligar a leitura da imagem sem deploy: REVISOR_ARTE_DESLIGADO=true (as
 * regras sem modelo continuam).
 */
export async function revisarArte(p: {
  franqueadaId: string;
  aprovacaoId: string;
  tipo: string;
  urlImagem: string | null;
  urlsSlides: string[] | null;
  /** O texto da arte; sem ele não dá pra redesenhar sem foto. */
  pecas: ConteudoPeca[] | null;
  temFoto: boolean;
  desenhoReserva?: boolean;
  assunto?: string;
  ctx?: ContextoRevisao;
  brand: BrandGuidelines;
  capaEstilo?: EstiloCapa;
}): Promise<ResultadoRevisaoArte> {
  const base: ResultadoRevisaoArte = {
    urlImagem: p.urlImagem,
    urlsSlides: p.urlsSlides,
    acao: "ok",
    achados: [],
    olhar: null,
    urlAntes: null,
  };
  if (!p.urlImagem) return base;

  try {
    const achados = achadosMecanicos({ pecas: p.pecas, desenhoReserva: p.desenhoReserva, ctx: p.ctx });
    let olhar: OlharArte | null = null;

    const lerImagem =
      p.temFoto && process.env.REVISOR_ARTE_DESLIGADO !== "true" && !!process.env.ANTHROPIC_API_KEY;
    if (lerImagem) {
      try {
        const res = await fetch(p.urlImagem, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
        if (res.ok) {
          const png = Buffer.from(await res.arrayBuffer());
          const texto = (p.pecas ?? [])
            .slice(0, 1)
            .map((x) => [x.headline, x.subtitle].filter(Boolean).join(" / "))
            .join("");
          const r = await olharArte(png, { texto, assunto: p.assunto });
          olhar = r.olhar;
          await logarCusto({
            franqueadaId: p.franqueadaId,
            servico: "claude",
            operacao: "revisar_arte",
            modelo: CLAUDE_MODEL_AGENTES,
            uso: r.uso,
            aprovacaoId: p.aprovacaoId,
            sucesso: !!olhar,
            metadata: { tipo: p.tipo },
          });
          if (olhar) achados.push(...achadosDoOlhar(olhar));
        }
      } catch (e) {
        console.warn("[revisor-arte] leitura da imagem falhou; segue sem ela:", (e as Error).message);
      }
    }

    let acao = decidirAcao(achados, { temFoto: p.temFoto, podeRefazer: !!p.pecas?.length });
    let urlImagem = p.urlImagem;
    let urlsSlides = p.urlsSlides;
    let urlAntes: string | null = null;

    if (acao === "refazer_sem_foto" && p.pecas?.length) {
      try {
        if (p.tipo === "feed_carrossel") {
          const r = await gerarCarrosselEUpload({
            franqueadaId: p.franqueadaId,
            brand: p.brand,
            slides: p.pecas,
            capaEstilo: p.capaEstilo,
          });
          if (!r.urls.length) throw new Error("carrossel sem slides");
          urlImagem = r.urls[0]!;
          urlsSlides = r.urls;
        } else {
          const r = await gerarEUploadImagem({
            franqueadaId: p.franqueadaId,
            tipo: p.tipo as "feed_imagem" | "stories",
            brand: p.brand,
            conteudo: p.pecas[0]!,
          });
          urlImagem = r.url;
        }
        urlAntes = p.urlImagem;
      } catch (e) {
        console.warn("[revisor-arte] refazer sem foto falhou; fica a arte original:", (e as Error).message);
        achados.push({
          regra: "refazer_falhou",
          gravidade: "confira",
          trecho: "",
          motivo: "O revisor tentou refazer a arte sem foto e não conseguiu. A arte original seguiu.",
        });
        acao = "sinalizar";
      }
    }

    if (achados.length) console.warn(`[revisor-arte] ${p.tipo}: ${acao} — ${resumoAchados(achados)}`);
    return { urlImagem, urlsSlides, acao, achados, olhar, urlAntes };
  } catch (e) {
    console.warn("[revisor-arte] falhou; segue a arte como saiu:", (e as Error).message);
    return base;
  }
}

/** Grava a revisão (o admin lê daqui). Falha só vai pro log. */
export async function registrarRevisaoArte(
  admin: Admin,
  r: ResultadoRevisaoArte & { postId: string; franqueadaId: string; semanaRef: string; tipo: string },
): Promise<void> {
  if (r.acao === "ok" && !r.olhar) return;
  const { error } = await admin.from("revisoes_arte").insert({
    post_id: r.postId,
    franqueada_id: r.franqueadaId,
    semana_ref: r.semanaRef,
    tipo_post: r.tipo,
    acao: r.acao,
    achados: r.achados,
    olhar: r.olhar,
    url_antes: r.urlAntes,
  } as never);
  if (error) console.warn("[revisor-arte] revisão não gravada:", error.message);
}
