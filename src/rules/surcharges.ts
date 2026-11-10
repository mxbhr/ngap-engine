import type { RatedAct } from "./cumulation.js";
import { flatFeeCents, type FlatFee } from "../tariffs.js";

export interface SurchargeLine {
  code: FlatFee;
  amountCents: number;
  reason: string;
}

export interface SurchargeContext {
  /** ISO date-time of the session, local time (e.g. "2026-11-10T21:30"). */
  dateTime: string;
  /** Public holiday flag; the engine does not embed a holiday calendar. */
  publicHoliday?: boolean;
  /** Night surcharges require night care to be prescribed. */
  nightCarePrescribed?: boolean;
  /** Nurse coordination surcharge (palliative care, complex dressings). */
  coordination?: boolean;
  /** Care delivered within a dependent-patient (BSI) daily package. */
  dependencyPackage?: boolean;
}

/** MAU applies to a single billed AMI/AMX act with a coefficient up to 1.5. */
export const MAU_MAX_COEFFICIENT = 1.5;

export function computeSurcharges(
  rated: readonly RatedAct[],
  ctx: SurchargeContext,
): SurchargeLine[] {
  const date = ctx.dateTime.slice(0, 10);
  const billed = rated.filter((r) => r.rate > 0);
  const lines: SurchargeLine[] = [];

  const single = billed.length === 1 ? billed[0] : undefined;
  if (single && single.act.coefficient <= MAU_MAX_COEFFICIENT && !ctx.dependencyPackage) {
    lines.push({
      code: "MAU",
      amountCents: flatFeeCents("MAU", date),
      reason: `Single act with coefficient ≤ ${MAU_MAX_COEFFICIENT}`,
    });
  }

  if (ctx.coordination && billed.length > 0) {
    lines.push({
      code: "MCI",
      amountCents: flatFeeCents("MCI", date),
      reason: "Nurse coordination",
    });
  }

  const time = timeSurcharge(ctx);
  if (time && billed.length > 0) {
    lines.push({ ...time, amountCents: flatFeeCents(time.code, date) });
  }

  return lines;
}

/**
 * Night and Sunday/holiday surcharges are not cumulative:
 * only the most favourable one applies.
 */
function timeSurcharge(ctx: SurchargeContext): Omit<SurchargeLine, "amountCents"> | undefined {
  const date = new Date(`${ctx.dateTime}Z`);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid dateTime: ${ctx.dateTime}`);
  }
  const hour = date.getUTCHours();
  const sunday = date.getUTCDay() === 0;

  const candidates: Omit<SurchargeLine, "amountCents">[] = [];
  if (ctx.nightCarePrescribed) {
    if (hour >= 23 || hour < 5) {
      candidates.push({ code: "DEEP_NIGHT", reason: "Prescribed care between 11 pm and 5 am" });
    } else if (hour >= 20 || hour < 8) {
      candidates.push({ code: "NIGHT", reason: "Prescribed care between 8-11 pm or 5-8 am" });
    }
  }
  if (sunday || ctx.publicHoliday) {
    candidates.push({ code: "SUNDAY_HOLIDAY", reason: sunday ? "Sunday" : "Public holiday" });
  }

  const rank: Record<string, number> = { DEEP_NIGHT: 3, NIGHT: 2, SUNDAY_HOLIDAY: 1 };
  return candidates.sort((a, b) => (rank[b.code] ?? 0) - (rank[a.code] ?? 0))[0];
}
