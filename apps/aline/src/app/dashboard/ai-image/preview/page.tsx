import { redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { PreviewForm } from "./PreviewForm";

export const dynamic = "force-dynamic";

export default async function AIImagePreviewPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Pega perfis pra preencher preset de marca (scannerdasaude / nutrisecrets)
  const aline = createAlineClient();
  const { data: perfis } = await aline
    .from("perfis")
    .select("slug, nome, instagram_handle")
    .eq("ativo", true);

  const perfisLista = (perfis ?? []) as Array<{ slug: string; nome: string; instagram_handle: string }>;

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <a href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Dashboard
          </a>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">
            AI Image — Preview
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Gera imagens de teste com GPT-Image-1 (OpenAI) ou Nano Banana (Google).
            Use os presets de <b>@scannerdasaude</b> e <b>@nutrisecrets</b>.
          </p>
        </div>
        <PreviewForm perfis={perfisLista} />
      </div>
    </main>
  );
}
