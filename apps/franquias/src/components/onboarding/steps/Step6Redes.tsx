"use client";

import { useState } from "react";
import { Field, FormWrapper } from "@/components/ui/Field";
import type { StepFormProps } from "../Wizard";

export function Step6Redes({ dados, atualizar }: StepFormProps) {
  const temPagina = !!(dados.facebook_pagina_id || dados.facebook_pagina_url);
  const temPubler = !!dados.publer_profile_id;
  const [paginaUrl, setPaginaUrl] = useState((dados.facebook_pagina_url as string) ?? "");
  const [salvandoPagina, setSalvandoPagina] = useState(false);
  const [erroPagina, setErroPagina] = useState<string | null>(null);
  const [msgPagina, setMsgPagina] = useState<string | null>(null);
  const [guiaAberto, setGuiaAberto] = useState(false);
  const [verificandoPubler, setVerificandoPubler] = useState(false);
  const [msgPubler, setMsgPubler] = useState<string | null>(null);

  async function handleVincularPagina() {
    if (!paginaUrl.trim()) {
      setErroPagina("Cole o link da sua Página do Facebook");
      return;
    }
    if (!paginaUrl.includes("facebook.com")) {
      setErroPagina("O link deve ser de uma Página do Facebook (facebook.com/...)");
      return;
    }
    setSalvandoPagina(true);
    setErroPagina(null);
    setMsgPagina(null);

    try {
      // Salva a URL no perfil
      atualizar({ facebook_pagina_url: paginaUrl });

      // Chama a API para resolver Page ID, criar Ad Account e solicitar acesso
      const res = await fetch("/api/meta/bm/setup-franqueada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facebookPaginaUrl: paginaUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErroPagina(data.erro ?? "Não conseguimos encontrar essa Página. Verifique o link.");
      } else if (data.aviso) {
        setMsgPagina("Página salva. A configuração de anúncios será concluída em breve pela equipe.");
      } else {
        setMsgPagina(
          "Página vinculada! Você receberá um e-mail do Facebook para aceitar a conexão com nossa plataforma.",
        );
        atualizar({ facebook_pagina_id: data.paginaId });
      }
    } catch {
      setErroPagina("Erro de conexão. Tente novamente.");
    } finally {
      setSalvandoPagina(false);
    }
  }

  async function handleVerificarPubler() {
    setVerificandoPubler(true);
    setMsgPubler(null);
    try {
      const res = await fetch("/api/publer/accounts");
      const data = await res.json();
      if (data.contaVinculada) {
        atualizar({ publer_profile_id: data.contaVinculada.id });
        setMsgPubler(`Instagram @${data.contaVinculada.name} encontrado e vinculado!`);
      } else {
        setMsgPubler(
          "Ainda não encontramos seu Instagram conectado. Complete a conexão no link acima e clique aqui novamente.",
        );
      }
    } catch {
      setMsgPubler("Erro ao verificar. Tente novamente.");
    } finally {
      setVerificandoPubler(false);
    }
  }

  return (
    <FormWrapper
      title="Redes sociais"
      descricao="Configure suas redes e conecte o Instagram para publicação automática."
    >
      {/* Campos de redes */}
      <Field
        label="Instagram (@handle)"
        name="instagram_handle"
        value={dados.instagram_handle as string}
        onChange={(v) => atualizar({ instagram_handle: v.replace("@", "") })}
        placeholder="scannerdasaude"
        required
        hint="Sem o @. Precisa ser conta profissional (Criador ou Empresarial)."
      />
      <Field
        label="TikTok (opcional)"
        name="tiktok_handle"
        value={dados.tiktok_handle as string}
        onChange={(v) => atualizar({ tiktok_handle: v.replace("@", "") })}
      />
      <Field
        label="YouTube (URL do canal)"
        name="youtube_canal"
        type="url"
        value={dados.youtube_canal as string}
        onChange={(v) => atualizar({ youtube_canal: v })}
      />
      <Field
        label="Site próprio"
        name="site_proprio"
        type="url"
        value={dados.site_proprio as string}
        onChange={(v) => atualizar({ site_proprio: v })}
      />
      <Field
        label="Linktree / bio.link"
        name="linktree_ou_similar"
        type="url"
        value={dados.linktree_ou_similar as string}
        onChange={(v) => atualizar({ linktree_ou_similar: v })}
      />

      {/* ── Guia: como criar Página no Facebook ── */}
      <div className="rounded-xl border border-brand-text/10 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setGuiaAberto(!guiaAberto)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-brand-text hover:bg-brand-muted/50"
        >
          <span>📘 Não tem Página no Facebook? Veja como criar em 3 minutos</span>
          <span className="text-brand-text/40">{guiaAberto ? "▲" : "▼"}</span>
        </button>
        {guiaAberto && (
          <div className="border-t border-brand-text/10 px-4 py-4 space-y-3">
            <p className="text-xs text-brand-text/60">
              O Instagram Profissional precisa estar vinculado a uma Página do Facebook para publicação automática e anúncios. Siga os passos:
            </p>
            <ol className="space-y-2 text-sm text-brand-text">
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">1</span>
                <span>Abra o <strong>Facebook</strong> no celular ou computador</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">2</span>
                <span>Toque no menu <strong>(≡)</strong> e selecione <strong>"Páginas"</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">3</span>
                <span>Clique em <strong>"Criar nova Página"</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">4</span>
                <span>Use o <strong>nome da sua clínica</strong> como nome da Página, categoria <em>Nutricionista</em></span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">5</span>
                <span>No Instagram, vá em <strong>Configurações → Conta → Vincular ao Facebook</strong> e selecione essa Página</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">6</span>
                <span>Copie o link da Página (facebook.com/suapagina) e cole abaixo</span>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* ── Vincular Página do Facebook ── */}
      <div className={`rounded-xl border-2 p-5 ${temPagina ? "border-green-200 bg-green-50" : "border-dashed border-brand-primary/30 bg-brand-primary/5"}`}>
        <div className="mb-2 text-sm font-semibold text-brand-text">
          {temPagina ? "✅ Página do Facebook vinculada" : "🔗 Vincular Página do Facebook"}
        </div>
        {temPagina ? (
          <div className="space-y-1">
            <p className="text-xs text-brand-text/70">
              {dados.facebook_pagina_id
                ? `Página ID: ${dados.facebook_pagina_id as string}`
                : dados.facebook_pagina_url as string}
            </p>
            {(dados.meta_page_access_status as string) === "solicitado" && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                ⏳ Aguardando você aceitar o e-mail do Facebook para vincular à plataforma.
              </p>
            )}
            {(dados.meta_page_access_status as string) === "aceito" && (
              <p className="text-xs text-green-700">Acesso confirmado pela equipe.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-brand-text/60">
              Cole abaixo o link da sua Página do Facebook (ex: facebook.com/suaclinica).
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={paginaUrl}
                onChange={(e) => setPaginaUrl(e.target.value)}
                placeholder="https://www.facebook.com/suaclinica"
                className="flex-1 rounded-lg border border-brand-text/10 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleVincularPagina}
                disabled={salvandoPagina || !paginaUrl}
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60 whitespace-nowrap"
              >
                {salvandoPagina ? "Vinculando..." : "Vincular"}
              </button>
            </div>
            {erroPagina && (
              <p className="text-xs text-red-600">{erroPagina}</p>
            )}
            {msgPagina && (
              <p className="text-xs text-green-700">{msgPagina}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Conectar Instagram para publicação (Publer) ── */}
      <div className={`rounded-xl border-2 p-5 ${temPubler ? "border-green-200 bg-green-50" : "border-dashed border-purple-200 bg-purple-50/50"}`}>
        <div className="mb-1 text-sm font-semibold text-brand-text">
          {temPubler ? "✅ Instagram conectado para publicação" : "📲 Conectar Instagram para publicação automática"}
        </div>
        {temPubler ? (
          <p className="text-xs text-brand-text/70">
            Seu Instagram está pronto para receber posts automáticos aprovados por você.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-brand-text/60">
              Clique no link abaixo, faça login no Facebook e conecte sua conta Instagram.
              Depois volte aqui e clique em "Verificar conexão".
            </p>
            <a
              href={`https://app.publer.com/workspace/${process.env.NEXT_PUBLIC_PUBLER_WORKSPACE_ID ?? ""}/settings/accounts`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Conectar Instagram →
            </a>
            <div>
              <button
                type="button"
                onClick={handleVerificarPubler}
                disabled={verificandoPubler}
                className="text-xs text-brand-primary hover:underline disabled:opacity-60"
              >
                {verificandoPubler ? "Verificando..." : "Já conectei — verificar conexão"}
              </button>
              {msgPubler && (
                <p className={`mt-1 text-xs ${msgPubler.includes("encontrado") ? "text-green-700" : "text-amber-700"}`}>
                  {msgPubler}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </FormWrapper>
  );
}
