"use client";

import { useState } from "react";

export default function DeletarDadosPage() {
  const [status, setStatus] = useState<"idle" | "enviando" | "enviado" | "erro">(
    "idle",
  );
  const [mensagem, setMensagem] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("enviando");
    setMensagem("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    const res = await fetch("/api/deletar-dados", {
      method: "POST",
      body: JSON.stringify({
        email: fd.get("email"),
        motivo: fd.get("motivo"),
        instagram: fd.get("instagram"),
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      setStatus("enviado");
      setMensagem(
        "Solicitação recebida. Em até 30 dias sua conta e todos os dados associados serão excluídos. Você receberá um email de confirmação.",
      );
      form.reset();
    } else {
      setStatus("erro");
      const j = await res.json().catch(() => ({}));
      setMensagem(j.erro ?? "Erro ao enviar. Tente novamente ou escreva pra privacidade@scannerdasaude.com");
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <article className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold">Excluir meus dados</h1>

        <div className="prose prose-slate mb-8">
          <p>
            De acordo com a LGPD (Lei 13.709/2018) e com as políticas da Meta, você
            pode solicitar a exclusão completa dos seus dados da plataforma Scanner
            da Saúde a qualquer momento.
          </p>

          <h2>O que será excluído</h2>
          <ul>
            <li>Sua conta de acesso e credenciais</li>
            <li>
              Dados cadastrais (nome, CPF, CRN, email, endereço)
            </li>
            <li>
              Dados profissionais (nicho, público-alvo, diferenciais, tom de
              comunicação)
            </li>
            <li>Tokens OAuth do Instagram (revogados imediatamente)</li>
            <li>Histórico de posts gerados e publicados via plataforma</li>
            <li>Métricas e relatórios</li>
            <li>Arquivos enviados (logo, fotos, vídeos)</li>
            <li>Campanhas de anúncios registradas na plataforma</li>
          </ul>

          <h2>O que NÃO será excluído</h2>
          <ul>
            <li>
              Posts já publicados no seu próprio Instagram (esses ficam sob seu
              controle pela conta da Meta, não nosso)
            </li>
            <li>
              Registros financeiros obrigatórios por lei (notas fiscais, dados
              contábeis) — retidos por 5 anos conforme legislação
            </li>
          </ul>

          <h2>Prazo</h2>
          <p>
            Sua solicitação será processada em até <strong>30 dias úteis</strong>.
            Você receberá um email de confirmação quando a exclusão for concluída.
          </p>

          <h2>Contato alternativo</h2>
          <p>
            Se preferir, envie um email direto pra{" "}
            <a href="mailto:privacidade@scannerdasaude.com">
              privacidade@scannerdasaude.com
            </a>{" "}
            com o assunto &ldquo;Solicitação de exclusão de dados&rdquo;.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-brand-text/10 bg-brand-muted/30 p-6"
        >
          <h2 className="mb-4 text-lg font-semibold">Formulário de exclusão</h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="email">
              Email cadastrado *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-brand-text/10 bg-white px-3 py-2"
              placeholder="seu@email.com"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="instagram">
              Instagram @handle (opcional)
            </label>
            <input
              id="instagram"
              name="instagram"
              type="text"
              className="w-full rounded-lg border border-brand-text/10 bg-white px-3 py-2"
              placeholder="@seuinstagram"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="motivo">
              Motivo (opcional — ajuda a melhorar o produto)
            </label>
            <textarea
              id="motivo"
              name="motivo"
              rows={3}
              className="w-full rounded-lg border border-brand-text/10 bg-white px-3 py-2"
              placeholder="Ex: cancelei a franquia, não uso mais, etc."
            />
          </div>

          <button
            type="submit"
            disabled={status === "enviando"}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {status === "enviando" ? "Enviando..." : "Confirmar solicitação de exclusão"}
          </button>

          {mensagem && (
            <p
              className={`mt-3 text-sm ${
                status === "enviado" ? "text-green-700" : "text-red-700"
              }`}
            >
              {mensagem}
            </p>
          )}
        </form>
      </article>
    </main>
  );
}
