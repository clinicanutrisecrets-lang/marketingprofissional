import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { agruparJornadas, resumoFunil, type EventoConversao } from "@/lib/leads/jornada";

export const dynamic = "force-dynamic";

const ESTAGIO_UI: Record<string, { label: string; cls: string }> = {
  Lead: { label: "Lead", cls: "bg-blue-100 text-blue-800" },
  Schedule: { label: "Consulta agendada", cls: "bg-amber-100 text-amber-800" },
  InitiateCheckout: { label: "Checkout enviado", cls: "bg-purple-100 text-purple-800" },
  Purchase: { label: "Comprou", cls: "bg-green-100 text-green-800" },
};

function extrairContato(payload: unknown): { nome?: string; email?: string; phone?: string } {
  const p = (payload ?? {}) as Record<string, unknown>;
  const c = (p.cliente ?? p.paciente ?? {}) as Record<string, unknown>;
  return {
    nome: typeof c.nome === "string" ? c.nome : undefined,
    email: typeof c.email === "string" ? c.email : undefined,
    phone: typeof c.phone === "string" ? c.phone : undefined,
  };
}

export default async function LeadsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: f } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!f) redirect("/onboarding");
  const franqueadaId = (f as { id: string }).id;

  const { data: convs } = await supabase
    .from("conversoes_registradas")
    .select("tipo, event_time, value, fbclid, anuncio_id, payload_origem")
    .eq("franqueada_id", franqueadaId)
    .order("event_time", { ascending: false })
    .limit(2000);

  const eventos: EventoConversao[] = ((convs ?? []) as Array<Record<string, unknown>>).map((c) => {
    const contato = extrairContato(c.payload_origem);
    return {
      tipo: c.tipo as string,
      event_time: c.event_time as string,
      value: c.value != null ? Number(c.value) : null,
      fbclid: (c.fbclid as string) ?? null,
      anuncio_id: (c.anuncio_id as string) ?? null,
      nome: contato.nome ?? null,
      email: contato.email ?? null,
      phone: contato.phone ?? null,
    };
  });

  const jornadas = agruparJornadas(eventos);
  const resumo = resumoFunil(jornadas);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">Meus leads</h1>
        <p className="text-sm text-brand-text/60 mt-1">
          Pacientes que chegaram pelos seus anúncios e em que estágio cada uma está.
        </p>
      </div>

      {/* Resumo do funil */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Leads", v: resumo.leads },
          { label: "Agendaram", v: resumo.agendamentos },
          { label: "Checkout", v: resumo.checkouts },
          { label: "Compraram", v: resumo.compras },
          { label: "Receita", v: formatCurrency(resumo.receita) },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-brand-muted p-4">
            <div className="text-xs uppercase tracking-wide text-brand-text/50">{card.label}</div>
            <div className="text-xl font-bold text-brand-text mt-1">{card.v}</div>
          </div>
        ))}
      </div>

      {jornadas.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-muted p-8 text-center text-brand-text/60">
          Ainda não há leads registrados. Assim que seus anúncios começarem a trazer pacientes,
          eles aparecem aqui.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-muted overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-muted/40 text-brand-text/70">
              <tr>
                <th className="text-left font-medium px-4 py-3">Paciente</th>
                <th className="text-left font-medium px-4 py-3">Estágio</th>
                <th className="text-right font-medium px-4 py-3">Comprou</th>
                <th className="text-right font-medium px-4 py-3">Última atividade</th>
              </tr>
            </thead>
            <tbody>
              {jornadas.map((j) => {
                const ui = ESTAGIO_UI[j.estagio] ?? { label: j.estagio, cls: "bg-gray-100 text-gray-700" };
                return (
                  <tr key={j.chave} className="border-t border-brand-muted/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-text">{j.nome ?? "Paciente"}</div>
                      <div className="text-xs text-brand-text/50">{j.contato ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ui.cls}`}>
                        {ui.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {j.valorComprado > 0 ? formatCurrency(j.valorComprado) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-brand-text/60">
                      {formatDate(j.ultimaAtividade)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
