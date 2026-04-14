"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CardPicker, Field, TextArea, Select } from "@/components/ui/Field";
import { criarAnuncioDraft, buscarBenchmark } from "@/lib/anuncios/actions";
import type { ObjetivoNegocio } from "@/lib/meta/ads";

const OBJETIVOS: Array<{
  value: ObjetivoNegocio;
  label: string;
  descricao: string;
  emoji: string;
}> = [
  { value: "ganhar_seguidores", label: "Ganhar seguidores", descricao: "Crescer perfil Instagram", emoji: "👥" },
  { value: "receber_mensagens", label: "Receber mensagens", descricao: "Pacientes mandam WhatsApp", emoji: "💬" },
  { value: "agendar_consultas", label: "Agendar consultas", descricao: "Lead qualificado pra consulta", emoji: "📅" },
  { value: "vender_teste_genetico", label: "Vender teste genético", descricao: "Venda direta + comissão", emoji: "🧬" },
  { value: "alcance", label: "Alcance (visualizações)", descricao: "Mais gente vê o conteúdo", emoji: "🎥" },
  { value: "trafego_site", label: "Tráfego pro site", descricao: "Cliques pra landing page", emoji: "🌐" },
];

export function CriarAnuncioForm({
  nicho,
  funis,
  linkCtaPadrao,
}: {
  nicho: string | null;
  funis: Array<{ id: string; nome: string; tipo: string; wa_numero: string | null }>;
  linkCtaPadrao: string | null;
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [objetivo, setObjetivo] = useState<ObjetivoNegocio>("receber_mensagens");
  const [tema, setTema] = useState("");
  const [publico, setPublico] = useState("");
  const [funilId, setFunilId] = useState(funis[0]?.id ?? "");
  const [budgetDiario, setBudgetDiario] = useState(30);
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState("");
  const [copyHead, setCopyHead] = useState("");
  const [copyTexto, setCopyTexto] = useState("");
  const [copyCta, setCopyCta] = useState("Saiba mais");

  const [benchmark, setBenchmark] = useState<Awaited<ReturnType<typeof buscarBenchmark>>>(null);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!nicho) return;
    buscarBenchmark(nicho, objetivo).then(setBenchmark);
  }, [objetivo, nicho]);

  async function handleSubmit() {
    setErro(null);
    if (!nome || !tema) {
      setErro("Preencha nome e tema");
      return;
    }
    startTransition(async () => {
      const r = await criarAnuncioDraft({
        nome,
        objetivo_negocio: objetivo,
        tema_criativo: tema,
        funil_destino_id: funilId || undefined,
        publico_descricao: publico,
        budget_diario: budgetDiario,
        data_inicio: dataInicio,
        data_fim: dataFim || undefined,
        copy_headline: copyHead,
        copy_texto: copyTexto,
        copy_cta_botao: copyCta,
      });
      if (r.ok) {
        setMsg("Anúncio criado como rascunho! Nossa equipe revisa e ativa no Meta Ads.");
        setTimeout(() => router.push("/dashboard/anuncios"), 1500);
      } else {
        setErro(r.erro ?? "Erro");
      }
    });
  }

  const funilSelecionado = funis.find((f) => f.id === funilId);

  return (
    <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
      <Field
        label="Nome interno da campanha"
        name="nome"
        value={nome}
        onChange={setNome}
        placeholder='Ex: "Captação outubro - mulheres 30-50"'
        required
      />

      <CardPicker
        label="Qual é o objetivo?"
        value={objetivo}
        onChange={(v) => setObjetivo(v as ObjetivoNegocio)}
        options={OBJETIVOS.map((o) => ({
          value: o.value,
          label: `${o.emoji} ${o.label}`,
          descricao: o.descricao,
        }))}
        required
      />

      {benchmark && (
        <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
          <div className="mb-2 font-semibold">📊 Benchmark do seu nicho</div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <BenchCell label="Excelente" value={benchmark.valor_excelente} cor="text-green-700" />
            <BenchCell label="Bom" value={benchmark.valor_bom} cor="text-green-600" />
            <BenchCell label="Mediano" value={benchmark.valor_mediano} cor="text-yellow-600" />
            <BenchCell label="Ruim" value={benchmark.valor_ruim} cor="text-red-600" />
          </div>
          <p className="mt-2 text-xs text-blue-700">
            Métrica: {benchmark.metrica.toUpperCase()} — valores em R$ (fonte: Meta Ads BR)
          </p>
        </div>
      )}

      <TextArea
        label="Tema / ângulo do criativo"
        name="tema"
        value={tema}
        onChange={setTema}
        placeholder='Ex: "Entenda como escalar sua clínica sem sacrificar qualidade. Formulário rápido + vídeo demo personalizado."'
        rows={3}
        required
        hint="Mais específico = IA gera copy melhor"
      />

      {funis.length > 0 && (
        <Select
          label="Funil de destino"
          name="funil_destino_id"
          value={funilId}
          onChange={setFunilId}
          options={funis.map((f) => ({
            value: f.id,
            label: `${f.nome} (${f.tipo.replace(/_/g, " ")})`,
          }))}
          hint={
            funilSelecionado?.wa_numero
              ? `Leads vão pra WhatsApp: ${funilSelecionado.wa_numero}`
              : "Configura o destino final do CTA"
          }
        />
      )}

      {funis.length === 0 && (
        <div className="rounded-lg border border-dashed border-brand-text/20 p-3 text-xs text-brand-text/60">
          Nenhum funil configurado. Pode usar o link de CTA padrão:{" "}
          <code className="rounded bg-brand-muted px-1">{linkCtaPadrao ?? "—"}</code>
        </div>
      )}

      <TextArea
        label="Público-alvo"
        name="publico"
        value={publico}
        onChange={setPublico}
        placeholder="Ex: mulheres 30-50, Curitiba + 30km, interesse em saúde/nutrição"
        rows={2}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Budget diário (R$)"
          name="budget_diario"
          type="number"
          value={budgetDiario}
          onChange={(v) => setBudgetDiario(Number(v) || 0)}
          required
          hint="Mínimo R$6"
        />
        <Field
          label="Data início"
          name="data_inicio"
          type="text"
          value={dataInicio}
          onChange={setDataInicio}
        />
        <Field
          label="Data fim (opcional)"
          name="data_fim"
          type="text"
          value={dataFim}
          onChange={setDataFim}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Headline do anúncio"
          name="copy_headline"
          value={copyHead}
          onChange={setCopyHead}
          maxLength={40}
          placeholder="Até 40 caracteres"
        />
        <Field
          label="Texto do botão"
          name="copy_cta"
          value={copyCta}
          onChange={setCopyCta}
          placeholder="Ex: Falar agora, Saiba mais"
        />
      </div>

      <TextArea
        label="Texto principal do anúncio"
        name="copy_texto"
        value={copyTexto}
        onChange={setCopyTexto}
        rows={4}
        maxLength={125}
        hint="Até 125 caracteres pra não cortar no feed"
      />

      {msg && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{msg}</div>}
      {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        ℹ️ Anúncios criados aqui ficam como <strong>rascunho</strong>. A equipe do Scanner
        revisa e ativa no Meta Ads. Métricas aparecem aqui quando a campanha estiver no ar.
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full rounded-lg bg-brand-primary px-5 py-3 text-base font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60"
      >
        {isPending ? "Criando..." : "💾 Salvar como rascunho"}
      </button>
    </div>
  );
}

function BenchCell({ label, value, cor }: { label: string; value: number; cor: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className={`mt-0.5 font-bold ${cor}`}>R$ {value}</div>
    </div>
  );
}
