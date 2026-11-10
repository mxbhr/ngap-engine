import { describe, expect, it } from "vitest";
import {
  ACTS,
  ARTICLES,
  CATALOG,
  findAct,
  applyArticle11B,
  billableKm,
  dailyMileage,
  formatEuros,
  letterKeyCents,
  quote,
} from "../src/index.js";

const { TOPICAL_ANALGESIA } = CATALOG;
const { BLOOD_DRAW, SC_INJECTION, SIMPLE_DRESSING, COMPLEX_DRESSING, INSULIN_INJECTION, DIABETES_MONITORING, SHORT_PERFUSION, LONG_PERFUSION } = CATALOG;

describe("tariffs", () => {
  it("uses the AMI value in force on the given date", () => {
    expect(letterKeyCents("AMI", "2026-11-06")).toBe(315);
    expect(letterKeyCents("AMI", "2026-11-07")).toBe(335);
    expect(letterKeyCents("AMI", "2027-11-01")).toBe(345);
  });
});

describe("article 11B", () => {
  const rates = (acts: Parameters<typeof applyArticle11B>[0]) =>
    applyArticle11B(acts).map((r) => [r.act.code, r.rate]);

  it("bills highest at 100 %, second at 50 %, others at 0", () => {
    expect(rates([SC_INJECTION, COMPLEX_DRESSING, SIMPLE_DRESSING])).toEqual([
      ["COMPLEX_DRESSING", 1],
      ["SIMPLE_DRESSING", 0.5],
      ["SC_INJECTION", 0],
    ]);
  });

  it("keeps a blood draw at full rate within two billed acts", () => {
    expect(rates([BLOOD_DRAW, SIMPLE_DRESSING, SC_INJECTION])).toEqual([
      ["BLOOD_DRAW", 1],
      ["SIMPLE_DRESSING", 1],
      ["SC_INJECTION", 0],
    ]);
  });

  it("cumulates insulin-treated patient acts at full rate", () => {
    expect(rates([INSULIN_INJECTION, DIABETES_MONITORING])).toEqual([
      ["INSULIN_INJECTION", 1],
      ["DIABETES_MONITORING", 1],
    ]);
  });

  it("falls back to the general rule when the group is mixed", () => {
    expect(rates([INSULIN_INJECTION, SIMPLE_DRESSING])).toEqual([
      ["SIMPLE_DRESSING", 1],
      ["INSULIN_INJECTION", 0.5],
    ]);
  });

  it("cumulates short and long perfusions at full rate", () => {
    expect(rates([SHORT_PERFUSION, LONG_PERFUSION])).toEqual([
      ["LONG_PERFUSION", 1],
      ["SHORT_PERFUSION", 1],
    ]);
  });
});

describe("catalog", () => {
  it("covers Titre XVI with unique codes and known articles", () => {
    expect(ACTS.length).toBeGreaterThan(90);
    expect(new Set(ACTS.map((a) => a.code)).size).toBe(ACTS.length);
    const articles = new Set(ARTICLES.map((a) => a.id));
    expect(ACTS.every((a) => a.article && articles.has(a.article))).toBe(true);
  });

  it("bills topical analgesia at full rate with its dressing", () => {
    const rated = applyArticle11B([COMPLEX_DRESSING, TOPICAL_ANALGESIA]);
    expect(rated.map((r) => r.rate)).toEqual([1, 1]);
  });

  it("does not count topical analgesia toward the blood-draw limit", () => {
    const rated = applyArticle11B([BLOOD_DRAW, COMPLEX_DRESSING, TOPICAL_ANALGESIA, SC_INJECTION]);
    expect(rated.map((r) => [r.act.code, r.rate])).toEqual([
      ["BLOOD_DRAW", 1],
      ["TOPICAL_ANALGESIA", 1],
      ["COMPLEX_DRESSING", 1],
      ["SC_INJECTION", 0],
    ]);
  });

  it("flags acts that cannot be billed together", () => {
    const q = quote({ acts: [findAct("CATHETERISATION_F"), findAct("NEUROGENIC_BLADDER_REHAB")], dateTime: "2026-11-10T10:00" });
    expect(q.conflicts).toEqual([{ group: "bladder", codes: ["CATHETERISATION_F", "NEUROGENIC_BLADDER_REHAB"] }]);
  });
});

describe("surcharges", () => {
  const codes = (q: ReturnType<typeof quote>) => q.lines.map((l) => l.code);

  it("adds MAU for a single act up to coefficient 1.5", () => {
    const q = quote({ acts: [SC_INJECTION], dateTime: "2026-11-10T10:00" });
    expect(codes(q)).toContain("MAU");
  });

  it("does not add MAU when two acts are billed", () => {
    const q = quote({ acts: [SC_INJECTION, SIMPLE_DRESSING], dateTime: "2026-11-10T10:00" });
    expect(codes(q)).not.toContain("MAU");
  });

  it("applies only the most favourable time surcharge", () => {
    // Sunday 15 November 2026, 23:30, prescribed night care
    const q = quote({ acts: [SIMPLE_DRESSING], dateTime: "2026-11-15T23:30", nightCarePrescribed: true });
    expect(codes(q)).toContain("DEEP_NIGHT");
    expect(codes(q)).not.toContain("SUNDAY_HOLIDAY");
  });

  it("ignores night hours without a night-care prescription", () => {
    const q = quote({ acts: [SIMPLE_DRESSING], dateTime: "2026-11-10T21:00" });
    expect(codes(q)).not.toContain("NIGHT");
  });
});

describe("travel", () => {
  it("deducts 4 km round trip in plain and 2 km in mountain", () => {
    expect(billableKm({ distanceKm: 10, terrain: "plain" })).toBe(16);
    expect(billableKm({ distanceKm: 10, terrain: "mountain" })).toBe(18);
  });

  it("bills nothing within the same agglomeration or under the threshold", () => {
    expect(billableKm({ distanceKm: 10, terrain: "plain", sameAgglomeration: true })).toBe(0);
    expect(billableKm({ distanceKm: 2, terrain: "plain" })).toBe(0);
  });

  it("applies the daily cap on cumulated kilometres", () => {
    // 3 trips of 102 billable km each (53 km one way, plain) = 306 km
    const lines = dailyMileage("2026-11-10", [
      { distanceKm: 53, terrain: "plain" },
      { distanceKm: 53, terrain: "plain" },
      { distanceKm: 53, terrain: "plain" },
    ]);
    const total = lines.reduce((s, l) => s + l.amountCents, 0);
    // km 1-299 at 0.35 €, km 300-306 at 0.175 €
    expect(total).toBe(Math.round(299 * 35 + 7 * 17.5));
  });
});

describe("quote", () => {
  it("produces an explainable home-visit quote", () => {
    const q = quote({
      acts: [COMPLEX_DRESSING, SC_INJECTION],
      dateTime: "2026-11-10T09:00",
      homeVisitPrescribed: true,
      trip: { distanceKm: 6, terrain: "plain" },
    });
    // AMI 4 × 3.35 + AMI 1 × 3.35 × 50 % + IFD 2.75 + 8 km × 0.35
    expect(q.totalCents).toBe(1340 + 168 + 275 + 280);
    expect(formatEuros(q.totalCents)).toBe("20,63 €");
    expect(q.lines.every((l) => l.reason.length > 0)).toBe(true);
  });
});
