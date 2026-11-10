import { flatFeeCents } from "../tariffs.js";

export type Terrain = "plain" | "mountain";

export interface Trip {
  /** One-way distance in km from the nearest practice location. */
  distanceKm: number;
  terrain: Terrain;
  /** No mileage when the patient lives in the same agglomeration. */
  sameAgglomeration?: boolean;
}

/** Round-trip allowance deducted before mileage is billed. */
const ROUND_TRIP_DEDUCTION_KM: Record<Terrain, number> = { plain: 4, mountain: 2 };
/** Minimum one-way distance for mileage to be billable. */
const MIN_DISTANCE_KM: Record<Terrain, number> = { plain: 2, mountain: 1 };

/** Daily cap: km 300-399 paid at 50 %, nothing from the 400th km. */
export const DAILY_HALF_RATE_FROM_KM = 300;
export const DAILY_ZERO_FROM_KM = 400;

export interface MileageLine {
  billableKm: number;
  amountCents: number;
  reason: string;
}

export function travelFlatFee(date: string, homeVisitPrescribed: boolean): number {
  return homeVisitPrescribed ? flatFeeCents("IFD", date) : 0;
}

export function billableKm(trip: Trip): number {
  if (trip.sameAgglomeration) return 0;
  if (trip.distanceKm <= MIN_DISTANCE_KM[trip.terrain]) return 0;
  return Math.max(0, trip.distanceKm * 2 - ROUND_TRIP_DEDUCTION_KM[trip.terrain]);
}

/**
 * Computes mileage allowances for all trips of one nurse on one day,
 * applying the daily cap on cumulated kilometres.
 */
export function dailyMileage(date: string, trips: readonly Trip[]): MileageLine[] {
  let cumulated = 0;
  return trips.map((trip) => {
    const km = billableKm(trip);
    const rateCents = flatFeeCents(
      trip.terrain === "plain" ? "IK_PLAIN_PER_KM" : "IK_MOUNTAIN_PER_KM",
      date,
    );

    let amount = 0;
    for (let i = 0; i < km; i++) {
      const kmIndex = cumulated + i + 1;
      if (kmIndex < DAILY_HALF_RATE_FROM_KM) amount += rateCents;
      else if (kmIndex < DAILY_ZERO_FROM_KM) amount += rateCents / 2;
    }
    cumulated += km;

    const reason =
      km === 0
        ? trip.sameAgglomeration
          ? "Same agglomeration, no mileage"
          : `Distance below ${MIN_DISTANCE_KM[trip.terrain]} km (${trip.terrain})`
        : `${trip.distanceKm} km × 2 − ${ROUND_TRIP_DEDUCTION_KM[trip.terrain]} km deduction (${trip.terrain})`;

    return { billableKm: km, amountCents: Math.round(amount), reason };
  });
}
