import type { LetterKey } from "./tariffs.js";

/**
 * A nursing act as listed in the NGAP.
 *
 * The engine only relies on these fields, so any act of the nomenclature can
 * be described without changing the code.
 */
export interface Act {
  code: string;
  label: string;
  letter: LetterKey;
  coefficient: number;
  /**
   * Derogation to article 11B: the act is always billed at full rate.
   * When such an act is present, the session is limited to two billed acts.
   */
  alwaysFullRate?: boolean;
  /**
   * Acts sharing a group are cumulated at full rate when the session only
   * contains acts of that group (e.g. insulin-treated patients, art. 5 bis).
   */
  fullRateGroup?: string;
  /** Perfusion derogation: a short and a long perfusion cumulate at full rate. */
  perfusion?: "short" | "long";
}

/**
 * A small catalog of frequent acts, provided for convenience and examples.
 * Coefficients must be checked against the official NGAP before production use.
 */
export const CATALOG = {
  BLOOD_DRAW: {
    code: "BLOOD_DRAW",
    label: "Prélèvement sanguin par ponction veineuse directe",
    letter: "AMI",
    coefficient: 1.5,
    alwaysFullRate: true,
  },
  SC_INJECTION: {
    code: "SC_INJECTION",
    label: "Injection sous-cutanée",
    letter: "AMI",
    coefficient: 1,
  },
  IM_INJECTION: {
    code: "IM_INJECTION",
    label: "Injection intramusculaire",
    letter: "AMI",
    coefficient: 1,
  },
  INSULIN_INJECTION: {
    code: "INSULIN_INJECTION",
    label: "Injection d'insuline (patient insulino-traité)",
    letter: "AMI",
    coefficient: 1,
    fullRateGroup: "art5bis",
  },
  DIABETES_MONITORING: {
    code: "DIABETES_MONITORING",
    label: "Surveillance d'un patient diabétique insulino-traité",
    letter: "AMI",
    coefficient: 1,
    fullRateGroup: "art5bis",
  },
  SIMPLE_DRESSING: {
    code: "SIMPLE_DRESSING",
    label: "Pansement courant",
    letter: "AMI",
    coefficient: 2,
  },
  COMPLEX_DRESSING: {
    code: "COMPLEX_DRESSING",
    label: "Pansement lourd et complexe",
    letter: "AMI",
    coefficient: 4,
  },
  SHORT_PERFUSION: {
    code: "SHORT_PERFUSION",
    label: "Perfusion courte sous surveillance continue",
    letter: "AMI",
    coefficient: 9,
    perfusion: "short",
  },
  LONG_PERFUSION: {
    code: "LONG_PERFUSION",
    label: "Perfusion de plus d'une heure",
    letter: "AMI",
    coefficient: 14,
    perfusion: "long",
  },
} as const satisfies Record<string, Act>;
