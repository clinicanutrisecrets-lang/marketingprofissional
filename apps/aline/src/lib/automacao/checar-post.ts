/**
 * "A API pega os comentários DESTE post?" — responde por um link do Instagram.
 *
 * Serve principalmente pra post de ANÚNCIO. A dúvida é real e tem duas
 * respostas possíveis, que dependem de como o anúncio foi criado:
 *
 *   - anúncio que IMPULSIONA um post do feed → a mídia existe no perfil, a API
 *     lê e o webhook `comments` entrega. O robô cobre.
 *   - anúncio criado direto no Gerenciador, que nunca virou post no perfil
 *     ("dark post") → a mídia NÃO aparece em /me/media e a API do Instagram
 *     não devolve os comentários dela. Esses comentários só existem no
 *     Gerenciador de Anúncios / Meta Business Suite. O robô NÃO cobre.
 *
 * A checagem é a mesma nos dois casos: procurar o permalink na lista de mídias
 * da conta e, achando, tentar ler os comentários.
 *
 * 🔴 SÓ LEITURA. Não responde, não apaga, não publica.
 */
import { carregarPerfilPorSlug, credenciaisDoPerfil } from "@/lib/instagram/credenciais";
import { listarComentarios, listarMidiasDetalhadas, type MidiaDetalhada } from "@/lib/instagram/api";
import { codigoDoLink } from "./checar-post-link";

export { codigoDoLink };

export type ResultadoChecagem = {
  entrada: string;
  codigo: string | null;
  encontrado: boolean;
  /** O robô consegue tratar comentário deste post? */
  cobertoPeloRobo: boolean;
  veredito: string;
  midia?: Pick<MidiaDetalhada, "id" | "permalink" | "media_type" | "media_product_type" | "timestamp" | "comments_count"> & {
    legenda?: string;
  };
  comentarios?: { lidos: number; amostra: Array<{ username?: string; texto?: string }>; erro?: string };
  postsVarridos: number;
};

export async function checarPost(slug: string, link: string, limitePosts = 200): Promise<ResultadoChecagem> {
  const codigo = codigoDoLink(link);
  if (!codigo) {
    return {
      entrada: link,
      codigo: null,
      encontrado: false,
      cobertoPeloRobo: false,
      veredito: "Não consegui ler o código do post nesse link. Mande o link do post (o que tem /p/ ou /reel/).",
      postsVarridos: 0,
    };
  }

  const perfil = await carregarPerfilPorSlug(slug);
  if (!perfil) throw new Error("Perfil não encontrado");
  const acesso = await credenciaisDoPerfil(perfil);
  if (!acesso.cred) throw new Error(acesso.motivo);
  const cred = acesso.cred;

  const midias = await listarMidiasDetalhadas(cred, limitePosts);
  const achada = midias.find((m) => (m.permalink ?? "").includes(`/${codigo}`));

  if (!achada) {
    return {
      entrada: link,
      codigo,
      encontrado: false,
      cobertoPeloRobo: false,
      veredito:
        `Esse post NÃO aparece entre as últimas ${midias.length} mídias da conta. ` +
        "Ou é anúncio criado direto no Gerenciador (não existe como post no perfil), e aí a API do " +
        "Instagram não entrega os comentários dele — só o Gerenciador de Anúncios entrega; " +
        "ou é post antigo, além da janela varrida.",
      postsVarridos: midias.length,
    };
  }

  let comentarios: ResultadoChecagem["comentarios"];
  try {
    const lista = await listarComentarios(cred, achada.id, 25);
    comentarios = {
      lidos: lista.length,
      amostra: lista.slice(0, 5).map((c) => ({ username: c.username, texto: c.text?.slice(0, 160) })),
    };
  } catch (e) {
    comentarios = { lidos: 0, amostra: [], erro: (e as Error).message.slice(0, 300) };
  }

  const leu = !comentarios.erro;
  return {
    entrada: link,
    codigo,
    encontrado: true,
    cobertoPeloRobo: leu,
    veredito: leu
      ? `O post existe no perfil e a API devolveu os comentários (${comentarios.lidos} lidos de ${achada.comments_count ?? 0}). ` +
        "O robô cobre: o webhook `comments` entrega comentário novo desse post."
      : `O post existe no perfil, mas a leitura dos comentários falhou: ${comentarios.erro}`,
    midia: {
      id: achada.id,
      permalink: achada.permalink,
      media_type: achada.media_type,
      media_product_type: achada.media_product_type,
      timestamp: achada.timestamp,
      comments_count: achada.comments_count,
      legenda: achada.caption?.slice(0, 200),
    },
    comentarios,
    postsVarridos: midias.length,
  };
}
