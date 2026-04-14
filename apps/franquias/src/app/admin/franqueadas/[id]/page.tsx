import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { FichaEditor } from "./FichaEditor";
import { ArquivosSection } from "./ArquivosSection";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function FranqueadaPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!admin) redirect("/");

  const adminDb = createAdminClient();

  const { data: franqueada } = await adminDb
    .from("franqueadas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!franqueada) notFound();

  const f = franqueada as Record<string, unknown>;

  const { data: arquivos } = await adminDb
    .from("arquivos_franqueada")
    .select("id, tipo, nome_arquivo, url_storage, formato, criado_em")
    .eq("franqueada_id", id)
    .order("criado_em", { ascending: false });

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <Link
          href="/admin"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-secondary"
        >
          ← Voltar
        </Link>

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-text">
              {(f.nome_completo as string) || "Sem nome"}
            </h1>
            <p className="text-sm text-brand-text/60">
              {(f.email as string) || "—"} ·{" "}
              {(f.whatsapp as string) || "sem whatsapp"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Pill label={(f.status as string) ?? "onboarding"} cor="amber" />
              <Pill label={(f.plano as string) ?? "basico"} cor="blue" />
              <Pill
                label={`${f.onboarding_percentual ?? 0}% onboarding`}
                cor="teal"
              />
              {f.instagram_handle ? (
                <Pill
                  label={`@${f.instagram_handle as string}`}
                  cor="purple"
                />
              ) : (
                <Pill label="Instagram não conectado" cor="red" />
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={`/admin/franqueadas/${id}/download-zip`}
              className="rounded-lg bg-brand-secondary px-4 py-2 text-sm font-medium text-white hover:bg-brand-secondary/90"
            >
              📦 Baixar tudo (ZIP)
            </a>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FichaEditor franqueadaId={id} initialData={f} />
          </div>

          <div className="space-y-4">
            <ArquivosSection arquivos={arquivos ?? []} />
            <TimelineBlock f={f} />
            <NotaAdmin franqueadaId={id} notaInicial={(f.nota_interna_admin as string) ?? ""} />
          </div>
        </div>
      </div>
    </main>
  );
}

function Pill({ label, cor }: { label: string; cor: string }) {
  const map: Record<string, string> = {
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-800",
    teal: "bg-teal-100 text-teal-800",
    purple: "bg-purple-100 text-purple-800",
    red: "bg-red-100 text-red-800",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 font-medium ${map[cor]}`}>
      {label}
    </span>
  );
}

function TimelineBlock({ f }: { f: Record<string, unknown> }) {
  const eventos = [
    { label: "Cadastro criado", data: f.criado_em },
    { label: "Última atualização", data: f.atualizado_em },
    { label: "Início do serviço", data: f.data_inicio_servico },
    { label: "Próxima revisão", data: f.data_proxima_revisao },
  ].filter((e) => e.data);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">Timeline</h3>
      <ul className="space-y-2 text-xs">
        {eventos.map((e, i) => (
          <li key={i} className="flex justify-between border-b border-brand-muted pb-1.5">
            <span className="text-brand-text/60">{e.label}</span>
            <span className="font-medium">{formatDate(e.data as string)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { NotaAdmin } from "./NotaAdmin";
