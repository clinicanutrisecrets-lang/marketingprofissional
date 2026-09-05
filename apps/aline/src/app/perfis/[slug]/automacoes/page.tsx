import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { direcionamentosParaTexto, lerConfig } from "@/lib/automacao/config";
import {
  alternarRegra,
  alternarSilenciarContato,
  excluirRegra,
  excluirSequencia,
  marcarContatoAtendido,
  salvarConfigAutomacao,
  salvarRegra,
  salvarSequencia,
} from "@/lib/automacao/actions";
import { SimuladorRobo } from "./SimuladorRobo";
import { MapearVoz } from "./MapearVoz";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | undefined>> };

const GATILHOS: Record<string, string> = {
  comentario: "Comentário em post",
  dm: "Mensagem no direct",
  story_reply: "Resposta a story",
  story_mention: "Menção em story",
};

export default async function AutomacoesPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const aline = createAlineClient();
  const { data: perfilData } = await aline
    .from("perfis")
    .select("id, slug, nome, instagram_handle, instagram_login_tipo, instagram_conta_id, instagram_token_expiry, webhook_assinado_em, automacao_config, cor_primaria")
    .eq("slug", slug)
    .maybeSingle();
  if (!perfilData) notFound();
  const perfil = perfilData as {
    id: string; slug: string; nome: string; instagram_handle: string; instagram_login_tipo: string;
    instagram_conta_id: string | null; instagram_token_expiry: string | null; webhook_assinado_em: string | null;
    automacao_config: unknown; cor_primaria: string | null;
  };
  const cor = perfil.cor_primaria || "#0BB8A8";
  const config = lerConfig(perfil.automacao_config);

  const [regrasRes, seqRes, passosRes, postsRes, contatosRes, mensagensRes, filaRes, humanoRes] = await Promise.all([
    aline.from("ig_regras").select("*").eq("perfil_id", perfil.id).order("prioridade").order("criado_em"),
    aline.from("ig_sequencias").select("id, nome, ativa").eq("perfil_id", perfil.id).order("criado_em"),
    aline.from("ig_sequencia_passos").select("sequencia_id, ordem, atraso_minutos, texto").order("ordem"),
    aline.from("posts").select("instagram_post_id, copy_legenda, data_hora_postada").eq("perfil_id", perfil.id).not("instagram_post_id", "is", null).order("data_hora_postada", { ascending: false }).limit(30),
    aline.from("ig_contatos").select("id, username, nome, tags, ultima_interacao_em, precisa_humano, precisa_humano_motivo, silenciado").eq("perfil_id", perfil.id).order("ultima_interacao_em", { ascending: false }).limit(25),
    aline.from("ig_mensagens").select("id, canal, direcao, texto, origem, criado_em, contato_id").eq("perfil_id", perfil.id).order("criado_em", { ascending: false }).limit(40),
    aline.from("ig_fila").select("id", { count: "exact", head: true }).eq("perfil_id", perfil.id).eq("status", "pendente"),
    aline.from("ig_contatos").select("id", { count: "exact", head: true }).eq("perfil_id", perfil.id).eq("precisa_humano", true),
  ]);

  type Regra = {
    id: string; nome: string; ativa: boolean; gatilho: string; palavras_chave: string[]; media_ids: string[];
    resposta_publica: string | null; resposta_privada: string | null; sequencia_id: string | null; tags_adicionar: string[];
    uma_vez_por_contato: boolean; prioridade: number;
  };
  const regras = (regrasRes.data ?? []) as Regra[];
  const sequencias = (seqRes.data ?? []) as Array<{ id: string; nome: string; ativa: boolean }>;
  const passos = (passosRes.data ?? []) as Array<{ sequencia_id: string; ordem: number; atraso_minutos: number; texto: string }>;
  const posts = (postsRes.data ?? []) as Array<{ instagram_post_id: string; copy_legenda: string | null; data_hora_postada: string | null }>;
  const contatos = (contatosRes.data ?? []) as Array<{
    id: string; username: string | null; nome: string | null; tags: string[]; ultima_interacao_em: string;
    precisa_humano: boolean; precisa_humano_motivo: string | null; silenciado: boolean;
  }>;
  const mensagens = (mensagensRes.data ?? []) as Array<{ id: string; canal: string; direcao: string; texto: string | null; origem: string | null; criado_em: string; contato_id: string | null }>;
  const contatoPorId = new Map(contatos.map((c) => [c.id, c]));

  const conectadoDireto = perfil.instagram_login_tipo === "instagram" && !!perfil.instagram_conta_id;
  const tokenVencido = !!perfil.instagram_token_expiry && new Date(perfil.instagram_token_expiry).getTime() < Date.now();
  const erroTela = (regrasRes.error ?? seqRes.error ?? contatosRes.error ?? mensagensRes.error)?.message;

  const salvarConfig = salvarConfigAutomacao.bind(null, slug);
  const salvarRegraAction = salvarRegra.bind(null, slug);
  const salvarSeqAction = salvarSequencia.bind(null, slug);

  return (
    <main className="min-h-screen bg-aline-bg">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <Link href={`/perfis/${slug}`} className="mb-4 inline-block text-sm text-aline-text/60 hover:text-aline-scanner">
          ← @{perfil.instagram_handle}
        </Link>

        <header className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-aline-text">Robô do Instagram</h1>
              <p className="text-sm text-aline-text/60">Comentários, stories e direct da @{perfil.instagram_handle}, sem ManyChat.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Pill ok={conectadoDireto && !tokenVencido} label={conectadoDireto ? (tokenVencido ? "Token vencido" : "Login do Instagram ok") : "Precisa conectar pelo login do Instagram"} />
              <Pill ok={!!perfil.webhook_assinado_em} label={perfil.webhook_assinado_em ? "Webhook assinado" : "Webhook pendente"} />
              <Pill ok={(filaRes.count ?? 0) === 0} label={`${filaRes.count ?? 0} na fila`} neutro />
              <Pill ok={(humanoRes.count ?? 0) === 0} label={`${humanoRes.count ?? 0} esperando uma pessoa`} />
            </div>
          </div>
          {!conectadoDireto && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Comentários e DMs só chegam pelo login direto do Instagram.{" "}
              <a className="underline" href={`/api/auth/instagram/connect?slug=${slug}`}>Conectar agora</a>.
            </p>
          )}
          {sp.erro && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{sp.erro}</p>}
          {erroTela && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">Erro ao carregar, recarregue a página: {erroTela}</p>}
        </header>

        {/* Chaves gerais */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-aline-text/60">Chaves gerais</h2>
          <p className="mb-4 text-xs text-aline-text/60">Valem quando nenhuma regra casa. As regras abaixo têm prioridade.</p>
          <form action={salvarConfig} className="space-y-4">
            <label className="flex items-start gap-3">
              <input type="checkbox" name="agradecer_comentarios" defaultChecked={config.agradecer_comentarios} className="mt-1" />
              <span className="text-sm">
                <strong>Agradecer todo comentário</strong> em público, com texto escrito na hora na voz do perfil.
                Pergunta clínica individual recebe o convite pro direct em vez de resposta clínica.
              </span>
            </label>
            <textarea name="texto_convite_direct" defaultValue={config.texto_convite_direct} rows={2} className={campo} placeholder="Resposta pública quando o comentário é pergunta clínica" />
            <label className="flex items-start gap-3">
              <input type="checkbox" name="responder_dm_scanner" defaultChecked={config.responder_dm_scanner} className="mt-1" />
              <span className="text-sm">
                <strong>Responder dúvidas no direct</strong> consultando a base do Scanner. Caso individual, compra ou reclamação
                é encaminhado pra uma pessoa (aparece na lista de contatos).
              </span>
            </label>
            <textarea name="texto_encaminhar_humano" defaultValue={config.texto_encaminhar_humano} rows={2} className={campo} placeholder="Texto quando o robô passa pra uma pessoa" />

            <div className="border-t border-aline-text/5 pt-4">
              <label className="mb-1 block text-sm font-medium">Quem o robô nunca responde</label>
              <p className="mb-2 text-xs text-aline-text/60">Nomes de usuário, separados por vírgula: família, equipe, amigas. Vale pra comentário e direct.</p>
              <input name="nao_responder_usernames" defaultValue={config.nao_responder_usernames.join(", ")} placeholder="ex.: pai.da.aline, julimendesnutri" className={campo} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Como eu falo</label>
              <p className="mb-2 text-xs text-aline-text/60">O retrato do seu jeito de escrever. O robô imita isto em todo comentário e DM gerados.</p>
              <textarea name="voz" defaultValue={config.voz} rows={8} className={campo} placeholder="Use o botão abaixo pra mapear a partir do seu Instagram, ou escreva você mesma." />
              <div className="mt-2"><MapearVoz slug={slug} cor={cor} /></div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Quando pedirem orientação ou prescrição</label>
              <p className="mb-2 text-xs text-aline-text/60">A regra do CFN já vale por baixo (nunca diagnóstico, nunca dose individual). Aqui você escreve, nas suas palavras, o que o robô deve dizer e pra onde levar a pessoa.</p>
              <textarea name="instrucoes_etica" defaultValue={config.instrucoes_etica} rows={4} className={campo} placeholder='ex.: "Explico que orientação individual só em consulta, porque depende de exames e história. Ofereço a Avaliação de Saúde como primeiro passo e mando o link."' />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Direcionamentos de conversão</label>
              <p className="mb-2 text-xs text-aline-text/60">Uma linha por caso: <code>quando a pessoa quer X -&gt; o que fazer / link</code>. O robô usa isto pra conduzir a DM quando a pessoa puxa assunto.</p>
              <textarea name="direcionamentos" defaultValue={direcionamentosParaTexto(config.direcionamentos)} rows={6} className={`${campo} font-mono text-xs`} placeholder={"quer consulta ou pergunta preço -> explicar que a primeira etapa é a Avaliação de Saúde e mandar https://...\nquer emagrecer / fala de inchaço, ansiedade -> apresentar o Lótus e mandar https://...\npergunta sobre teste genético -> explicar em 2 frases e mandar https://..."} />
            </div>

            <button className={BOTAO} style={{ background: cor }}>Salvar chaves</button>
          </form>
        </section>

        <SimuladorRobo slug={slug} cor={cor} />

        {/* Regras */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-aline-text/60">Regras</h2>
          <p className="mb-4 text-xs text-aline-text/60">
            Gatilho + palavra-chave → resposta pública, resposta no direct, sequência e tag. Use {"{primeiro_nome}"} e {"{username}"} no texto.
          </p>
          {regras.length === 0 ? (
            <p className="mb-4 text-sm text-aline-text/60">Nenhuma regra ainda.</p>
          ) : (
            <div className="mb-6 divide-y divide-aline-text/5">
              {regras.map((r) => (
                <details key={r.id} className="py-3">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.ativa ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{r.ativa ? "ativa" : "pausada"}</span>
                    <strong>{r.nome}</strong>
                    <span className="text-aline-text/60">· {GATILHOS[r.gatilho] ?? r.gatilho}</span>
                    {r.palavras_chave.length > 0 && <span className="text-aline-text/60">· {r.palavras_chave.join(", ")}</span>}
                    {r.media_ids.length > 0 && <span className="text-aline-text/60">· {r.media_ids.length} post(s)</span>}
                  </summary>
                  <FormRegra regra={r} posts={posts} sequencias={sequencias} action={salvarRegraAction} cor={cor} />
                  <div className="mt-2 flex gap-3 text-xs">
                    <form action={alternarRegra.bind(null, slug, r.id, !r.ativa)}><button className="underline">{r.ativa ? "Pausar" : "Ativar"}</button></form>
                    <form action={excluirRegra.bind(null, slug, r.id)}><button className="text-red-700 underline">Excluir</button></form>
                  </div>
                </details>
              ))}
            </div>
          )}
          <details className="rounded-lg border border-dashed border-aline-text/20 p-4">
            <summary className="cursor-pointer text-sm font-medium">+ Nova regra</summary>
            <FormRegra posts={posts} sequencias={sequencias} action={salvarRegraAction} cor={cor} />
          </details>
        </section>

        {/* Sequências */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-aline-text/60">Sequências</h2>
          <p className="mb-4 text-xs text-aline-text/60">
            Uma linha por mensagem: <code>minutos | texto</code>. O atraso conta a partir da mensagem anterior (1440 = 1 dia).
            Só sai dentro da janela de 24h da Meta: se a pessoa não respondeu mais, o resto é cancelado sozinho.
          </p>
          {sequencias.map((s) => {
            const ps = passos.filter((p) => p.sequencia_id === s.id);
            return (
              <details key={s.id} className="mb-3 rounded-lg border border-aline-text/10 p-4">
                <summary className="cursor-pointer text-sm"><strong>{s.nome}</strong> <span className="text-aline-text/60">· {ps.length} passo(s)</span></summary>
                <form action={salvarSeqAction} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={s.id} />
                  <input name="nome" defaultValue={s.nome} className={campo} />
                  <textarea name="passos" rows={Math.max(3, ps.length + 1)} className={`${campo} font-mono text-xs`} defaultValue={ps.map((p) => `${p.atraso_minutos} | ${p.texto}`).join("\n")} />
                  <div className="flex items-center gap-3">
                    <button className={BOTAO} style={{ background: cor }}>Salvar sequência</button>
                  </div>
                </form>
                <form action={excluirSequencia.bind(null, slug, s.id)} className="mt-2"><button className="text-xs text-red-700 underline">Excluir</button></form>
              </details>
            );
          })}
          <details className="rounded-lg border border-dashed border-aline-text/20 p-4">
            <summary className="cursor-pointer text-sm font-medium">+ Nova sequência</summary>
            <form action={salvarSeqAction} className="mt-3 space-y-2">
              <input name="nome" placeholder="Nome (ex.: Entrega do e-book)" className={campo} required />
              <textarea name="passos" rows={4} className={`${campo} font-mono text-xs`} placeholder={"0 | Oi, {primeiro_nome}! Segue o e-book: https://...\n1440 | Conseguiu ler? Me conta o que achou."} required />
              <button className={BOTAO} style={{ background: cor }}>Criar sequência</button>
            </form>
          </details>
        </section>

        {/* Contatos */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-aline-text/60">Contatos recentes</h2>
          {contatos.length === 0 ? (
            <p className="text-sm text-aline-text/60">Ninguém interagiu ainda.</p>
          ) : (
            <div className="divide-y divide-aline-text/5">
              {contatos.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <strong>{c.username ? `@${c.username}` : c.nome ?? "sem nome"}</strong>
                    {c.nome && c.username && <span className="text-aline-text/60"> · {c.nome}</span>}
                    {c.tags.length > 0 && <span className="ml-2 text-xs text-aline-text/60">{c.tags.map((t) => `#${t}`).join(" ")}</span>}
                    {c.precisa_humano && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">esperando uma pessoa{c.precisa_humano_motivo ? `: ${c.precisa_humano_motivo}` : ""}</span>}
                    {c.silenciado && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">robô desligado</span>}
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-aline-text/50">{quando(c.ultima_interacao_em)}</span>
                    {c.precisa_humano && <form action={marcarContatoAtendido.bind(null, slug, c.id)}><button className="underline">Atendi</button></form>}
                    <form action={alternarSilenciarContato.bind(null, slug, c.id, !c.silenciado)}><button className="underline">{c.silenciado ? "Religar robô" : "Desligar robô"}</button></form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Últimas mensagens */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-aline-text/60">Últimas interações</h2>
          {mensagens.length === 0 ? (
            <p className="text-sm text-aline-text/60">Nada registrado ainda. Quando o webhook estiver ligado, tudo que entrar e sair aparece aqui.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {mensagens.map((m) => {
                const c = m.contato_id ? contatoPorId.get(m.contato_id) : undefined;
                return (
                  <div key={m.id} className={`rounded-lg p-2 ${m.direcao === "saida" ? "bg-aline-muted" : "bg-white ring-1 ring-aline-text/5"}`}>
                    <div className="mb-0.5 flex flex-wrap gap-2 text-xs text-aline-text/60">
                      <span>{m.direcao === "saida" ? "→ robô" : "← " + (c?.username ? `@${c.username}` : c?.nome ?? "pessoa")}</span>
                      <span>· {m.canal}</span>
                      {m.origem && <span>· {m.origem}</span>}
                      <span>· {quando(m.criado_em)}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{m.texto ?? <em className="text-aline-text/50">(sem texto)</em>}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const campo = "w-full rounded-lg border border-aline-text/15 bg-white px-3 py-2 text-sm";
const BOTAO = "rounded-lg px-4 py-2 text-sm font-medium text-white";

function Pill({ ok, label, neutro }: { ok: boolean; label: string; neutro?: boolean }) {
  const cls = neutro ? "bg-gray-100 text-gray-700" : ok ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900";
  return <span className={`rounded-full px-3 py-1 font-medium ${cls}`}>{label}</span>;
}

function quando(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

function FormRegra({
  regra, posts, sequencias, action, cor,
}: {
  regra?: { id: string; nome: string; gatilho: string; palavras_chave: string[]; media_ids: string[]; resposta_publica: string | null; resposta_privada: string | null; sequencia_id: string | null; tags_adicionar: string[]; uma_vez_por_contato: boolean; prioridade: number };
  posts: Array<{ instagram_post_id: string; copy_legenda: string | null; data_hora_postada: string | null }>;
  sequencias: Array<{ id: string; nome: string }>;
  action: (form: FormData) => Promise<void>;
  cor: string;
}) {
  return (
    <form action={action} className="mt-3 grid gap-3 md:grid-cols-2">
      {regra && <input type="hidden" name="id" value={regra.id} />}
      <input name="nome" defaultValue={regra?.nome} placeholder="Nome da regra (ex.: E-book do post do cortisol)" className={campo} required />
      <select name="gatilho" defaultValue={regra?.gatilho ?? "comentario"} className={campo}>
        {Object.entries(GATILHOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input name="palavras_chave" defaultValue={regra?.palavras_chave.join(", ")} placeholder="Palavras-chave (vírgula). Vazio = qualquer texto" className={campo} />
      <input name="media_ids" defaultValue={regra?.media_ids.join(", ")} placeholder="IDs de post (só comentário). Vazio = todos" className={campo} list={`posts-${regra?.id ?? "novo"}`} />
      <datalist id={`posts-${regra?.id ?? "novo"}`}>
        {posts.map((p) => <option key={p.instagram_post_id} value={p.instagram_post_id}>{(p.copy_legenda ?? "").slice(0, 60)}</option>)}
      </datalist>
      <textarea name="resposta_publica" defaultValue={regra?.resposta_publica ?? ""} rows={2} placeholder="Resposta pública no comentário (só gatilho comentário)" className={`${campo} md:col-span-2`} />
      <textarea name="resposta_privada" defaultValue={regra?.resposta_privada ?? ""} rows={3} placeholder="Resposta no direct (link do material, cupom, etc.)" className={`${campo} md:col-span-2`} />
      <select name="sequencia_id" defaultValue={regra?.sequencia_id ?? ""} className={campo}>
        <option value="">Sem sequência</option>
        {sequencias.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
      </select>
      <input name="tags_adicionar" defaultValue={regra?.tags_adicionar.join(", ")} placeholder="Tags a adicionar (vírgula)" className={campo} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="uma_vez_por_contato" defaultChecked={regra?.uma_vez_por_contato ?? true} /> Uma vez por pessoa</label>
      <label className="flex items-center gap-2 text-sm">Prioridade <input type="number" name="prioridade" defaultValue={regra?.prioridade ?? 100} className={`${campo} w-24`} /> <span className="text-xs text-aline-text/50">menor = avaliada antes</span></label>
      <div className="md:col-span-2"><button className={BOTAO} style={{ background: cor }}>{regra ? "Salvar regra" : "Criar regra"}</button></div>
    </form>
  );
}
