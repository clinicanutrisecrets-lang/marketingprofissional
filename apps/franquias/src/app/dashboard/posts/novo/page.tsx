import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CriarPostForm } from "./CriarPostForm";

export const dynamic = "force-dynamic";

export default async function NovoPostPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: f } = await supabase
    .from("franqueadas")
    .select("id, nome_comercial")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!f) redirect("/onboarding");

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar
        </Link>

        {/* O texto antigo prometia "e agende" — mas nada aqui agenda nem
            publica (depende de liberação da Meta que não saiu), e o rodapé do
            formulário dizia justamente o contrário. A nutri lia o cabeçalho
            primeiro, não entendia a tela e perguntava pra que servia.
            (Juliana, 15/08: "essa parte aqui como usa?") */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Criar post manual</h1>
          <p className="mt-1 text-sm text-brand-text/70">
            É pra quando <strong>você já tem a foto ou o vídeo</strong> — tirou
            no consultório, gravou um story, recebeu do fotógrafo — e quer a
            legenda pronta em cima dela.
          </p>
          <p className="mt-3 rounded-lg bg-white px-4 py-3 text-sm text-brand-text/70 shadow-sm">
            Sobe a mídia, escreve a legenda (ou pede pra escrever por você), e
            salva. O post fica guardado na sua biblioteca com legenda e
            hashtags prontas pra copiar — <strong>quem publica no Instagram é
            você</strong>.
            <br />
            <span className="text-brand-text/50">
              Quer que o conteúdo seja criado do zero, com arte e tudo? Isso é o{" "}
              <Link href="/dashboard/conteudo" className="text-brand-primary underline">
                Estúdio de conteúdo
              </Link>
              .
            </span>
          </p>
        </header>

        <Suspense fallback={<div className="rounded-2xl bg-white p-6 text-sm text-brand-text/60">Carregando...</div>}>
          <CriarPostForm />
        </Suspense>
      </div>
    </main>
  );
}
