import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PreviewForm } from "./PreviewForm";

export const dynamic = "force-dynamic";

export default async function AIImagePreviewPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: adminRow } = await supabase
    .from("admins")
    .select("id, nome")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!adminRow) redirect("/");

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <a
            href="/admin"
            className="text-sm text-brand-text/60 hover:text-brand-primary"
          >
            ← Admin
          </a>
          <h1 className="mt-2 text-2xl font-bold text-brand-text">
            AI Image — Preview
          </h1>
          <p className="mt-1 text-sm text-brand-text/70">
            Gera uma imagem de teste usando GPT-Image-1 (OpenAI) ou Nano Banana
            (Google). Útil pra validar visual antes de aplicar em produção.
          </p>
        </div>
        <PreviewForm />
      </div>
    </main>
  );
}
