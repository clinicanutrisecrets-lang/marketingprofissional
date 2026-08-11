import Link from "next/link";

/**
 * Página pública de app.scannerdasaude.com.
 *
 * A porta de entrada da nutri é o menu do Scanner da Saúde (SSO — mesmo
 * login, sem senha nova), NÃO esta página. Ela existe pra quem digitou o
 * endereço direto e precisa saber pra onde ir.
 *
 * O painel interno não é anunciado aqui em cartão: a rota existe e é
 * protegida por middleware (só quem está na tabela `admins` entra), mas
 * expor o botão numa página pública só gera confusão em quem não é do
 * time — a Juliana caiu justamente nesta tela e ficou na dúvida se devia
 * clicar em "Painel Admin". Fica um link discreto no rodapé.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-muted to-white">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-block rounded-full bg-brand-primary/10 px-4 py-1 text-sm font-medium text-brand-primary">
            Marketing Profissional
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-brand-text sm:text-6xl">
            Scanner da Saúde
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-brand-text/70">
            Seu marketing produzido pra você: posts de Instagram no seu tom de
            voz, semana de conteúdo pronta pra aprovar e posts de venda dos seus
            produtos — exclusivo do Consultório de Precisão Avançado.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-primary/20 bg-white p-8 shadow-sm">
          <div className="mb-3 text-sm font-medium uppercase tracking-wide text-brand-primary">
            Como entrar
          </div>
          <h2 className="mb-3 text-2xl font-semibold text-brand-text">
            Pelo menu do Scanner da Saúde
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-brand-text/70">
            Você usa <strong>o mesmo login do Scanner</strong> — não existe senha
            separada aqui. Entre em scannerdasaude.com e, no menu lateral, abra{" "}
            <strong>Crescimento Profissional → Marketing Profissional</strong>.
          </p>
          <a
            href="https://scannerdasaude.com/nutri/marketing-profissional"
            className="inline-block rounded-lg bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary/90"
          >
            Ir para o Scanner da Saúde →
          </a>
          <p className="mt-6 border-t border-brand-text/10 pt-5 text-xs leading-relaxed text-brand-text/50">
            Já tem acesso e prefere entrar por aqui?{" "}
            <Link href="/login" className="text-brand-primary hover:underline">
              Entrar com e-mail e senha
            </Link>{" "}
            — só funciona se você já cadastrou uma senha; o caminho normal é pelo
            Scanner.
          </p>
        </div>

        <footer className="mt-20 text-center text-xs text-brand-text/40">
          © {new Date().getFullYear()} Scanner da Saúde · Aline Quissak ·{" "}
          <Link href="/admin/login" className="hover:text-brand-text/60">
            Equipe interna
          </Link>
        </footer>
      </div>
    </main>
  );
}
