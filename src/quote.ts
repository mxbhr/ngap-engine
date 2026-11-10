import type { Act } from "./acts.js";
import { applyArticle11B } from "./rules/cumulation.js";
import { computeSurcharges, type SurchargeContext } from "./rules/surcharges.js";
import { billableKm, travelFlatFee, type Trip } from "./rules/travel.js";
import { flatFeeCents, letterKeyCents } from "./tariffs.js";

export interface Session extends SurchargeContext {
  acts: readonly Act[];
  /** Home visit with a prescription mentioning home care. */
  homeVisitPrescribed?: boolean;
  /** Trip for this session; daily caps are handled by `dailyMileage`. */
  trip?: Trip;
}

export interface QuoteLine {
  code: string;
  label: string;
  /** e.g. "AMI 1.5", shown for nomenclature acts only. */
  coding?: string;
  rate?: number;
  amountCents: number;
  /** Stable rule identifier (e.g. "11B_SECOND", "MAU", "IK"), useful for translations. */
  rule: string;
  reason: string;
  /** Billable kilometres, for mileage lines. */
  km?: number;
}

export interface Quote {
  date: string;
  lines: QuoteLine[];
  totalCents: number;
}

const roundCents = (value: number) => Math.round(value);

export function quote(session: Session): Quote {
  const date = session.dateTime.slice(0, 10);
  const lines: QuoteLine[] = [];

  const rated = applyArticle11B(session.acts);
  for (const { act, rate, rule, reason } of rated) {
    const value = letterKeyCents(act.letter, date);
    lines.push({
      code: act.code,
      label: act.label,
      coding: `${act.letter} ${act.coefficient}`,
      rate,
      amountCents: roundCents(value * act.coefficient * rate),
      rule,
      reason,
    });
  }

  for (const s of computeSurcharges(rated, session)) {
    lines.push({ code: s.code, label: s.code, amountCents: s.amountCents, rule: s.code, reason: s.reason });
  }

  const ifd = travelFlatFee(date, Boolean(session.homeVisitPrescribed));
  if (ifd > 0) {
    lines.push({ code: "IFD", label: "Indemnité forfaitaire de déplacement", amountCents: ifd, rule: "IFD", reason: "Prescribed home visit" });
  }

  if (session.trip) {
    const km = billableKm(session.trip);
    if (km > 0) {
      const perKm = flatFeeCents(
        session.trip.terrain === "plain" ? "IK_PLAIN_PER_KM" : "IK_MOUNTAIN_PER_KM",
        date,
      );
      lines.push({
        code: "IK",
        label: "Indemnités kilométriques",
        amountCents: km * perKm,
        rule: "IK",
        km,
        reason: `${km} billable km (${session.trip.terrain}), before daily cap`,
      });
    }
  }

  return {
    date,
    lines,
    totalCents: lines.reduce((sum, l) => sum + l.amountCents, 0),
  };
}

export function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}
