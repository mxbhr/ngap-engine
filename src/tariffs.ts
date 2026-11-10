/**
 * Versioned tariff table.
 *
 * Every value carries the date it takes effect so that a quote for a past
 * date is always computed with the rates that applied on that day.
 * Amounts are stored in euro cents to avoid floating-point errors.
 */

export type LetterKey = "AMI" | "AMX";

export interface DatedValue {
  /** ISO date (YYYY-MM-DD) from which the value applies. */
  from: string;
  cents: number;
  source: string;
}

const AVENANT_11 =
  "Avenant 11, arrêté du 5 mai 2026 (JO du 6 mai 2026)";

export const LETTER_KEYS: Record<LetterKey, DatedValue[]> = {
  AMI: [
    { from: "2009-07-01", cents: 315, source: "NGAP" },
    { from: "2026-11-07", cents: 335, source: AVENANT_11 },
    { from: "2027-11-01", cents: 345, source: AVENANT_11 },
  ],
  AMX: [
    { from: "2009-07-01", cents: 315, source: "NGAP" },
    { from: "2026-11-07", cents: 335, source: AVENANT_11 },
    { from: "2027-11-01", cents: 345, source: AVENANT_11 },
  ],
};

export type FlatFee =
  | "MAU"
  | "MCI"
  | "NIGHT"
  | "DEEP_NIGHT"
  | "SUNDAY_HOLIDAY"
  | "IFD"
  | "IK_PLAIN_PER_KM"
  | "IK_MOUNTAIN_PER_KM";

export const FLAT_FEES: Record<FlatFee, DatedValue[]> = {
  MAU: [{ from: "2019-07-01", cents: 135, source: "NGAP, majoration d'acte unique" }],
  MCI: [{ from: "2019-07-01", cents: 500, source: "NGAP, majoration de coordination infirmière" }],
  NIGHT: [{ from: "2009-07-01", cents: 915, source: "NGAP, majoration de nuit 20h-23h / 5h-8h" }],
  DEEP_NIGHT: [{ from: "2009-07-01", cents: 1830, source: "NGAP, majoration de nuit 23h-5h" }],
  SUNDAY_HOLIDAY: [{ from: "2009-07-01", cents: 850, source: "NGAP, majoration dimanche et jours fériés" }],
  IFD: [
    { from: "2009-07-01", cents: 250, source: "NGAP" },
    { from: "2024-02-01", cents: 275, source: "Avenant 10" },
  ],
  IK_PLAIN_PER_KM: [{ from: "2020-01-01", cents: 35, source: "Avenant 6" }],
  IK_MOUNTAIN_PER_KM: [{ from: "2020-01-01", cents: 50, source: "Avenant 6" }],
};

/** Returns the value in force on `date`, or throws if none applies. */
export function valueAt(history: DatedValue[], date: string): DatedValue {
  let current: DatedValue | undefined;
  for (const entry of history) {
    if (entry.from <= date && (!current || entry.from > current.from)) {
      current = entry;
    }
  }
  if (!current) {
    throw new RangeError(`No tariff in force on ${date}`);
  }
  return current;
}

export function letterKeyCents(key: LetterKey, date: string): number {
  return valueAt(LETTER_KEYS[key], date).cents;
}

export function flatFeeCents(fee: FlatFee, date: string): number {
  return valueAt(FLAT_FEES[fee], date).cents;
}
