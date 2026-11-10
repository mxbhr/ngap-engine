import type { Act } from "../acts.js";

export interface RatedAct {
  act: Act;
  /** 1 = full rate, 0.5 = half rate, 0 = not billed. */
  rate: 1 | 0.5 | 0;
  reason: string;
}

const byCoefficientDesc = (a: Act, b: Act) => b.coefficient - a.coefficient;

/**
 * Applies article 11B of the NGAP general provisions to the acts performed
 * by one nurse for one patient during one session.
 *
 * - General rule: highest coefficient at 100 %, second at 50 %, others not billed.
 * - Same full-rate group only (e.g. art. 5 bis): every act at 100 %.
 * - Short + long perfusion: both at 100 %.
 * - Blood draw by direct venous puncture: 100 %, within a limit of two billed acts.
 */
export function applyArticle11B(acts: readonly Act[]): RatedAct[] {
  if (acts.length === 0) return [];

  const sorted = [...acts].sort(byCoefficientDesc);

  const group = sorted[0]?.fullRateGroup;
  if (group && sorted.every((a) => a.fullRateGroup === group)) {
    return sorted.map((act) => ({
      act,
      rate: 1,
      reason: `Art. 11B derogation: acts of group "${group}" cumulate at full rate`,
    }));
  }

  const hasShort = sorted.some((a) => a.perfusion === "short");
  const hasLong = sorted.some((a) => a.perfusion === "long");
  const perfusionPair = hasShort && hasLong;

  const exempt = sorted.filter(
    (a) => a.alwaysFullRate || (perfusionPair && a.perfusion !== undefined),
  );
  const ranked = sorted.filter((a) => !exempt.includes(a));

  const result: RatedAct[] = exempt.map((act) => ({
    act,
    rate: 1,
    reason: act.alwaysFullRate
      ? "Art. 11B derogation: always billed at full rate"
      : "Art. 11B derogation: short and long perfusions cumulate at full rate",
  }));

  const billedLimit = exempt.some((a) => a.alwaysFullRate) ? 2 : Infinity;

  ranked.forEach((act, index) => {
    const billedSoFar = result.filter((r) => r.rate > 0).length;
    if (billedSoFar >= billedLimit) {
      result.push({ act, rate: 0, reason: "Art. 11B: limit of two billed acts reached" });
    } else if (index === 0) {
      result.push({ act, rate: 1, reason: "Art. 11B: highest coefficient, full rate" });
    } else if (index === 1 && !exempt.some((a) => a.alwaysFullRate)) {
      result.push({ act, rate: 0.5, reason: "Art. 11B: second act, half rate" });
    } else {
      result.push({ act, rate: 0, reason: "Art. 11B: third act or more, not billed" });
    }
  });

  return result;
}
