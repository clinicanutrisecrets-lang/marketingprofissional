/**
 * Agrupa eventos de conversão (conversoes_registradas) em JORNADAS de paciente,
 * pra nutri ver "de quem é esse lead e em que estágio está". Lógica pura.
 */

export type EventoConversao = {
  tipo: string; // Lead | Schedule | InitiateCheckout | Purchase | Refund
  event_time: string;
  value: number | null;
  fbclid: string | null;
  anuncio_id: string | null;
  nome?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type Jornada = {
  chave: string;
  nome: string | null;
  contato: string | null; // mascarado
  estagio: string; // estágio mais avançado alcançado
  anuncioId: string | null;
  valorComprado: number; // soma de Purchase - Refund
  ultimaAtividade: string;
  eventos: number;
};

// quanto MAIOR, mais avançado no funil
const ORDEM_ESTAGIO: Record<string, number> = {
  Lead: 1,
  Schedule: 2,
  InitiateCheckout: 3,
  Purchase: 4,
};

/** Mascara email/telefone pra exibição (LGPD-friendly). */
export function mascararContato(email?: string | null, phone?: string | null): string | null {
  if (email && email.includes("@")) {
    const [user, dominio] = email.split("@");
    const u = user!.length <= 2 ? user! : `${user!.slice(0, 2)}***`;
    return `${u}@${dominio}`;
  }
  if (phone) {
    const d = phone.replace(/\D/g, "");
    if (d.length >= 4) return `***${d.slice(-4)}`;
  }
  return null;
}

function chaveJornada(e: EventoConversao): string {
  if (e.email) return `e:${e.email.trim().toLowerCase()}`;
  if (e.phone) return `p:${e.phone.replace(/\D/g, "")}`;
  if (e.fbclid) return `f:${e.fbclid}`;
  return `t:${e.event_time}`;
}

export function agruparJornadas(eventos: EventoConversao[]): Jornada[] {
  const mapa = new Map<string, EventoConversao[]>();
  for (const e of eventos) {
    const k = chaveJornada(e);
    const arr = mapa.get(k) ?? [];
    arr.push(e);
    mapa.set(k, arr);
  }

  const jornadas: Jornada[] = [];
  for (const [chave, evs] of mapa) {
    let estagio = "Lead";
    let melhorOrdem = 0;
    let valorComprado = 0;
    let nome: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;
    let anuncioId: string | null = null;
    let ultima = evs[0]!.event_time;

    for (const e of evs) {
      const ord = ORDEM_ESTAGIO[e.tipo] ?? 0;
      if (ord > melhorOrdem) {
        melhorOrdem = ord;
        estagio = e.tipo;
      }
      if (e.tipo === "Purchase") valorComprado += e.value ?? 0;
      if (e.tipo === "Refund") valorComprado -= Math.abs(e.value ?? 0);
      if (!nome && e.nome) nome = e.nome;
      if (!email && e.email) email = e.email;
      if (!phone && e.phone) phone = e.phone;
      if (!anuncioId && e.anuncio_id) anuncioId = e.anuncio_id;
      if (e.event_time > ultima) ultima = e.event_time;
    }

    jornadas.push({
      chave,
      nome,
      contato: mascararContato(email, phone),
      estagio,
      anuncioId,
      valorComprado: Math.max(0, Math.round(valorComprado * 100) / 100),
      ultimaAtividade: ultima,
      eventos: evs.length,
    });
  }

  // mais recentes primeiro
  return jornadas.sort((a, b) => (a.ultimaAtividade < b.ultimaAtividade ? 1 : -1));
}

export type ResumoFunil = {
  leads: number;
  agendamentos: number;
  checkouts: number;
  compras: number;
  receita: number;
};

/** Conta jornadas por estágio mais avançado + receita total. */
export function resumoFunil(jornadas: Jornada[]): ResumoFunil {
  const r: ResumoFunil = { leads: 0, agendamentos: 0, checkouts: 0, compras: 0, receita: 0 };
  for (const j of jornadas) {
    if (j.estagio === "Purchase") r.compras++;
    else if (j.estagio === "InitiateCheckout") r.checkouts++;
    else if (j.estagio === "Schedule") r.agendamentos++;
    else r.leads++;
    r.receita += j.valorComprado;
  }
  r.receita = Math.round(r.receita * 100) / 100;
  return r;
}
