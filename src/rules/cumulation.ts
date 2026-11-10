import type { Act } from "../acts.js";

/** Stable identifiers of the cumulation rules, useful for translations. */
export type CumulationRule =
  | "11B_FIRST"
  | "11B_SECOND"
  | "11B_NOT_BILLED"
  | "11B_SAME_GROUP"
  | "11B_ALWAYS_FULL"
  | "11B_PERFUSIONS"
  | "11B_TWO_ACTS_LIMIT";

export interface RatedAct {
  act: Act;
  /** 1 = full rate, 0.5 = half rate, 0 = not billed. */
  rate: 1 | 0.5 | 0;
  rule: CumulationRule;
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
 * - Topical analgesia before a dressing: 100 %.
 */
export function applyArticle11B(acts: readonly Act[]): RatedAct[] {
  if (acts.length === 0) return [];

  const sorted = [...acts].sort(byCoefficientDesc);

  const group = sorted[0]?.fullRateGroup;
  if (group && sorted.every((a) => a.fullRateGroup === group)) {
    return sorted.map((act) => ({
      act,
      rate: 1,
      rule: "11B_SAME_GROUP",
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

  const result: RatedAct[] = exempt.map((act) =>
    act.alwaysFullRate
      ? { act, rate: 1, rule: "11B_ALWAYS_FULL", reason: "Art. 11B derogation: always billed at full rate" }
      : { act, rate: 1, rule: "11B_PERFUSIONS", reason: "Art. 11B derogation: short and long perfusions cumulate at full rate" },
  );

  const twoActsLimit = sorted.some((a) => a.limitsToTwoActs);

  ranked.forEach((act, index) => {
    // Topical analgesia is attached to its dressing and does not count toward the limit.
    const billedSoFar = result.filter((r) => r.rate > 0 && !(r.act.alwaysFullRate && !r.act.limitsToTwoActs)).length;
    if (twoActsLimit && billedSoFar >= 2) {
      result.push({ act, rate: 0, rule: "11B_TWO_ACTS_LIMIT", reason: "Art. 11B: limit of two billed acts reached" });
    } else if (index === 0) {
      result.push({ act, rate: 1, rule: "11B_FIRST", reason: "Art. 11B: highest coefficient, full rate" });
    } else if (index === 1) {
      result.push({ act, rate: 0.5, rule: "11B_SECOND", reason: "Art. 11B: second act, half rate" });
    } else {
      result.push({ act, rate: 0, rule: "11B_NOT_BILLED", reason: "Art. 11B: third act or more, not billed" });
    }
  });

  return result;
}

export interface Conflict {
  group: string;
  codes: string[];
}

/** Acts that the nomenclature forbids billing together in one session. */
export function findConflicts(acts: readonly Act[]): Conflict[] {
  const groups = new Map<string, string[]>();
  for (const act of acts) {
    if (!act.exclusiveGroup) continue;
    groups.set(act.exclusiveGroup, [...(groups.get(act.exclusiveGroup) ?? []), act.code]);
  }
  return [...groups].filter(([, codes]) => codes.length > 1).map(([group, codes]) => ({ group, codes }));
}
