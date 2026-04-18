import { config } from "../config.js";
import { load, save } from "./state.js";

/**
 * Sorteia o próximo envio com jitter:
 * - dia: entre minDays e maxDays à frente
 * - hora: entre windowStartHour e windowEndHour
 * - minuto: 0-59
 */
export function computeNextRun(from = new Date()): Date {
  const { minDays, maxDays, windowStartHour, windowEndHour } = config.schedule;

  const daysAhead = randInt(minDays, maxDays);
  const hour = randInt(windowStartHour, Math.max(windowStartHour, windowEndHour - 1));
  const minute = randInt(0, 59);

  const next = new Date(from);
  next.setDate(next.getDate() + daysAhead);
  next.setHours(hour, minute, randInt(0, 59), 0);
  return next;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Loop simples baseado em setTimeout recursivo. Sem node-cron — porque o intervalo
 * muda a cada envio. Checa a cada 60s se já passou do nextRunAt.
 */
export function startScheduler(onFire: () => Promise<void>): void {
  let firing = false;

  const tick = async () => {
    if (firing) return;
    const s = load();

    // Primeira execução: agenda o próximo
    if (!s.nextRunAt) {
      const next = computeNextRun();
      s.nextRunAt = next.toISOString();
      save(s);
      console.log(`[scheduler] primeiro envio agendado para ${next.toLocaleString("pt-BR")}`);
      return;
    }

    const next = new Date(s.nextRunAt);
    if (Date.now() < next.getTime()) return;

    firing = true;
    try {
      console.log(`[scheduler] disparando envio (${new Date().toLocaleString("pt-BR")})`);
      await onFire();
    } catch (e) {
      console.error("[scheduler] envio falhou:", e);
      // Em caso de erro, tenta de novo em ~6h em vez de cair no próximo ciclo longo
      const retry = new Date(Date.now() + 6 * 3600 * 1000);
      const cur = load();
      cur.nextRunAt = retry.toISOString();
      save(cur);
      console.log(`[scheduler] retry agendado para ${retry.toLocaleString("pt-BR")}`);
    } finally {
      firing = false;
    }
  };

  tick();
  setInterval(tick, 60 * 1000);
}
