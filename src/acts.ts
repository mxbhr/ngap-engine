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
  /** NGAP location, e.g. "XVI-I-1" for Titre XVI, chapitre I, article 1. */
  article?: string;
  /** Article 11B derogation: the act is always billed at full rate. */
  alwaysFullRate?: boolean;
  /** When present in a session, at most two acts are billed (blood draw derogation). */
  limitsToTwoActs?: boolean;
  /**
   * Acts sharing a group are cumulated at full rate when the session only
   * contains acts of that group (e.g. insulin-treated patients, art. 5 bis).
   */
  fullRateGroup?: string;
  /** Perfusion derogation: a short and a long perfusion cumulate at full rate. */
  perfusion?: "short" | "long";
  /** Acts sharing an exclusive group cannot be billed together in one session. */
  exclusiveGroup?: string;
  /** Night and holiday surcharges cannot be billed with this act. */
  noTimeSurcharge?: boolean;
  /** Usage limit or condition worth showing to the nurse. */
  note?: string;
}

export interface ArticleInfo {
  id: string;
  title: string;
}

/** Articles of Titre XVI covered by the catalog, in nomenclature order. */
export const ARTICLES: ArticleInfo[] = [
  { id: "XVI-I-1", title: "Prélèvements et injections" },
  { id: "XVI-I-2", title: "Pansements courants" },
  { id: "XVI-I-3", title: "Pansements lourds et complexes" },
  { id: "XVI-I-4", title: "Sondes et alimentation" },
  { id: "XVI-I-5", title: "Appareil respiratoire" },
  { id: "XVI-I-6", title: "Appareil génito-urinaire" },
  { id: "XVI-I-7", title: "Appareil digestif" },
  { id: "XVI-I-8", title: "Tests et soins cutanés" },
  { id: "XVI-I-10", title: "Surveillance et prise médicamenteuse à domicile" },
  { id: "XVI-II-1", title: "Entretien des cathéters" },
  { id: "XVI-II-2", title: "Injections et prélèvements spécialisés" },
  { id: "XVI-II-3", title: "Perfusions" },
  { id: "XVI-II-4", title: "Patient immunodéprimé ou cancéreux" },
  { id: "XVI-II-5", title: "Mucoviscidose" },
  { id: "XVI-II-5bis", title: "Patient diabétique insulino-traité" },
  { id: "XVI-II-5ter", title: "Suivi post-hospitalisation (IC, BPCO)" },
  { id: "XVI-II-6", title: "Appareil digestif et urinaire" },
  { id: "XVI-II-7", title: "Soins post-opératoires selon protocole" },
];

type Row = [code: string, article: string, coefficient: number, label: string, extra?: Partial<Act>];

/**
 * Titre XVI, chapters I and II, as published in the NGAP version
 * in force in July 2026 (FNI consolidated edition of 3 July 2026).
 */
const ROWS: Row[] = [
  // Chapitre I, article 1
  ["BLOOD_DRAW", "XVI-I-1", 1.5, "Prélèvement par ponction veineuse directe", { alwaysFullRate: true, limitsToTwoActs: true }],
  ["BLEEDING", "XVI-I-1", 5, "Saignée"],
  ["ASEPTIC_SAMPLE", "XVI-I-1", 1, "Prélèvement aseptique cutané, muqueux, de selles ou d'urine"],
  ["IV_INJECTION", "XVI-I-1", 2, "Injection intraveineuse directe isolée"],
  ["IV_INJECTION_CHILD", "XVI-I-1", 2, "Injection intraveineuse directe, enfant de moins de 5 ans"],
  ["IV_INJECTION_SERIES", "XVI-I-1", 1.5, "Injection intraveineuse directe en série"],
  ["IM_INJECTION", "XVI-I-1", 1, "Injection intramusculaire"],
  ["BESREDKA_INJECTION", "XVI-I-1", 5, "Injection de sérum, méthode de Besredka"],
  ["SC_INJECTION", "XVI-I-1", 1, "Injection sous-cutanée"],
  ["ID_INJECTION", "XVI-I-1", 1, "Injection intradermique"],
  ["ALLERGEN_INJECTION", "XVI-I-1", 3, "Injection d'allergènes (hyposensibilisation)"],
  ["IMPLANT_INJECTION", "XVI-I-1", 2.5, "Injection d'implant sous-cutané"],
  ["RECTAL_DRIP", "XVI-I-1", 2, "Injection en goutte-à-goutte par voie rectale"],
  ["VACCINATION", "XVI-I-1", 2.4, "Vaccination avec prescription"],
  ["VACCINATION_NO_PRESCRIPTION", "XVI-I-1", 3.05, "Vaccination sans prescription médicale"],
  // Chapitre I, article 2
  ["STOMA_DRESSING", "XVI-I-2", 3, "Pansement de stomie"],
  ["TRACHEOSTOMY_DRESSING", "XVI-I-2", 3, "Pansement de trachéotomie"],
  ["SUTURE_REMOVAL", "XVI-I-2", 2, "Ablation de fils ou d'agrafes, dix ou moins"],
  ["SUTURE_REMOVAL_MORE", "XVI-I-2", 4, "Ablation de fils ou d'agrafes, plus de dix"],
  ["EXTENDED_SURGICAL_DRESSING", "XVI-I-2", 3, "Pansement de plaies opératoires étendues ou multiples"],
  ["VEIN_SURGERY_DRESSING", "XVI-I-2", 3, "Pansement après exérèse ou ligature de veines", { note: "Deux actes au plus" }],
  ["NON_SURGICAL_DRESSING", "XVI-I-2", 2.02, "Pansement de plaie non chirurgicale"],
  ["SIMPLE_DRESSING", "XVI-I-2", 2.02, "Pansement de plaie chirurgicale simple"],
  // Chapitre I, article 3
  ["WOUND_ASSESSMENT", "XVI-I-3", 11, "Bilan de première prise en charge d'une plaie (pansement lourd)", { note: "Non associable à la MCI" }],
  ["BURN_DRESSING", "XVI-I-3", 4, "Pansement de brûlure ou plaie chimique ou thermique étendue"],
  ["RADIOTHERAPY_BURN_DRESSING", "XVI-I-3", 4, "Pansement de brûlure après radiothérapie"],
  ["COMPLEX_DRESSING", "XVI-I-3", 4, "Pansement d'ulcère étendu ou de greffe (plus de 60 cm²)"],
  ["AMPUTATION_DRESSING", "XVI-I-3", 4, "Pansement d'amputation avec détersion"],
  ["FISTULA_DRESSING", "XVI-I-3", 4, "Pansement de fistule digestive"],
  ["DEEP_LOSS_DRESSING", "XVI-I-3", 4, "Pansement de perte de substance profonde"],
  ["WICKING_DRESSING", "XVI-I-3", 4, "Pansement avec méchage ou irrigation"],
  ["DEEP_PRESSURE_ULCER_DRESSING", "XVI-I-3", 4, "Pansement d'escarre profonde"],
  ["OSTEOSYNTHESIS_DRESSING", "XVI-I-3", 4, "Pansement avec matériel d'ostéosynthèse extériorisé"],
  ["COMPRESSION_DRESSING", "XVI-I-3", 5.1, "Pansement d'ulcère ou de greffe avec pose de compression"],
  ["TOPICAL_ANALGESIA", "XVI-I-3", 1.1, "Analgésie topique avant pansement d'ulcère ou d'escarre", { alwaysFullRate: true, note: "Huit par épisode de cicatrisation, renouvelable une fois" }],
  ["NEGATIVE_PRESSURE_SETUP", "XVI-I-3", 4.6, "Pose de système de traitement par pression négative"],
  ["NEGATIVE_PRESSURE_DRESSING", "XVI-I-3", 2.1, "Pansement additionnel de pression négative"],
  // Chapitre I, article 4
  ["GASTRIC_TUBE", "XVI-I-4", 3, "Pose de sonde gastrique"],
  ["ENTERAL_FEEDING", "XVI-I-4", 3, "Alimentation entérale par gavage ou nutri-pompe"],
  ["JEJUNAL_FEEDING", "XVI-I-4", 4, "Alimentation entérale par voie jéjunale"],
  // Chapitre I, article 5
  ["AEROSOL", "XVI-I-5", 1.5, "Séance d'aérosol"],
  ["SINUS_LAVAGE", "XVI-I-5", 2, "Lavage de sinus"],
  // Chapitre I, article 6
  ["VAGINAL_INJECTION", "XVI-I-6", 1.25, "Injection vaginale"],
  ["POST_BRACHYTHERAPY_CARE", "XVI-I-6", 1.5, "Soins gynécologiques après curiethérapie"],
  ["CATHETERISATION_F", "XVI-I-6", 3, "Cathétérisme urétral chez la femme", { exclusiveGroup: "bladder" }],
  ["CATHETERISATION_M", "XVI-I-6", 4, "Cathétérisme urétral chez l'homme", { exclusiveGroup: "bladder" }],
  ["CATHETER_CHANGE_F", "XVI-I-6", 3, "Changement de sonde à demeure chez la femme", { exclusiveGroup: "bladder" }],
  ["CATHETER_CHANGE_M", "XVI-I-6", 4, "Changement de sonde à demeure chez l'homme", { exclusiveGroup: "bladder" }],
  ["SELF_CATHETERISATION_TRAINING", "XVI-I-6", 3.5, "Éducation à l'autosondage", { exclusiveGroup: "bladder", note: "Dix séances au plus" }],
  ["NEUROGENIC_BLADDER_REHAB", "XVI-I-6", 4.5, "Rééducation de vessie neurologique", { exclusiveGroup: "bladder" }],
  ["BLADDER_INSTILLATION", "XVI-I-6", 1.25, "Instillation ou lavage vésical, sonde en place"],
  ["PENILE_SHEATH", "XVI-I-6", 1, "Pose isolée d'étui pénien", { note: "Une fois par 24 h" }],
  ["URINARY_CATHETER_REMOVAL", "XVI-I-6", 2, "Retrait de sonde urinaire"],
  // Chapitre I, article 7
  ["MOUTH_CARE", "XVI-I-7", 1.25, "Soins de bouche après radiothérapie"],
  ["ENEMA", "XVI-I-7", 3, "Lavement évacuateur ou médicamenteux"],
  ["FECALOMA_EXTRACTION", "XVI-I-7", 3, "Extraction de fécalome ou extraction manuelle des selles"],
  // Chapitre I, article 8
  ["SPRAY", "XVI-I-8", 1.25, "Pulvérisation de produits médicamenteux"],
  ["TUBERCULIN_TEST", "XVI-I-8", 0.5, "Test tuberculinique"],
  ["TUBERCULIN_READING", "XVI-I-8", 1, "Lecture de timbre tuberculinique"],
  // Chapitre I, article 10
  ["MEDICATION_SUPERVISION", "XVI-I-10", 1.2, "Administration et surveillance de la prise médicamenteuse", { exclusiveGroup: "art10" }],
  ["TREATMENT_SURVEILLANCE", "XVI-I-10", 1, "Surveillance lors d'un traitement nouveau ou modifié", { exclusiveGroup: "art10", note: "Quinze passages au plus" }],
  ["MEDICATION_SUPPORT_INITIAL", "XVI-I-10", 5.1, "Accompagnement de la prise médicamenteuse, séance initiale", { exclusiveGroup: "art10" }],
  ["MEDICATION_SUPPORT_FOLLOWUP", "XVI-I-10", 4.6, "Accompagnement de la prise médicamenteuse, 2ᵉ ou 3ᵉ séance", { exclusiveGroup: "art10" }],
  // Chapitre II, article 1
  ["PERITONEAL_CATHETER_CARE", "XVI-II-1", 4, "Entretien de cathéter péritonéal"],
  ["CENTRAL_CATHETER_CARE", "XVI-II-1", 4, "Entretien de cathéter extériorisé, site implantable ou PICC"],
  // Chapitre II, article 2
  ["ANALGESIC_INJECTION", "XVI-II-2", 5, "Injection d'analgésique par cathéter intrathécal ou péridural", { note: "Sur accord préalable" }],
  ["PORT_IV_INJECTION", "XVI-II-2", 4, "Injection intraveineuse par site implanté"],
  ["CENTRAL_IV_INJECTION", "XVI-II-2", 3, "Injection intraveineuse par cathéter central"],
  ["CENTRAL_BLOOD_DRAW", "XVI-II-2", 1, "Prélèvement sanguin sur cathéter central ou chambre implantable"],
  // Chapitre II, article 3
  ["SHORT_PERFUSION", "XVI-II-3", 9, "Perfusion d'une heure au plus sous surveillance continue", { perfusion: "short", exclusiveGroup: "perf3-removal" }],
  ["PERFUSION_EXTRA_HOUR", "XVI-II-3", 6, "Supplément par heure de surveillance continue", { note: "Cinq heures au plus" }],
  ["LONG_PERFUSION", "XVI-II-3", 14, "Perfusion de plus d'une heure avec organisation de la surveillance", { perfusion: "long" }],
  ["PERFUSION_REMOVAL", "XVI-II-3", 5, "Arrêt et retrait du dispositif de perfusion", { exclusiveGroup: "perf3-removal" }],
  ["PERFUSION_DAILY_PLANNING", "XVI-II-3", 4, "Forfait journalier d'organisation de la surveillance"],
  ["PERFUSION_INTERVENTION", "XVI-II-3", 4.1, "Changement de flacon ou intervention sur la perfusion"],
  // Chapitre II, article 4
  ["ONCO_AEROSOL", "XVI-II-4", 5, "Aérosol prophylactique"],
  ["ONCO_IM_SC_INJECTION", "XVI-II-4", 1.5, "Injection intramusculaire ou sous-cutanée"],
  ["ONCO_IV_INJECTION", "XVI-II-4", 2.5, "Injection intraveineuse"],
  ["CHEMOTHERAPY_INJECTION", "XVI-II-4", 7, "Injection intraveineuse de chimiothérapie"],
  ["ONCO_SHORT_PERFUSION", "XVI-II-4", 10, "Perfusion d'une heure au plus sous surveillance continue", { perfusion: "short", exclusiveGroup: "perf4-removal" }],
  ["ONCO_PERFUSION_EXTRA_HOUR", "XVI-II-4", 6, "Supplément par heure de surveillance continue", { note: "Cinq heures au plus" }],
  ["ONCO_LONG_PERFUSION", "XVI-II-4", 15, "Perfusion de plus d'une heure avec organisation de la surveillance", { perfusion: "long" }],
  ["ONCO_PERFUSION_REMOVAL", "XVI-II-4", 5, "Arrêt et retrait du dispositif de perfusion", { exclusiveGroup: "perf4-removal" }],
  ["ONCO_PERFUSION_DAILY_PLANNING", "XVI-II-4", 4, "Forfait journalier d'organisation de la surveillance"],
  ["ONCO_PERFUSION_INTERVENTION", "XVI-II-4", 4.1, "Changement de flacon ou intervention sur la perfusion"],
  // Chapitre II, article 5
  ["CF_ANTIBIOTIC_PERFUSION", "XVI-II-5", 15, "Perfusion d'antibiotiques sous surveillance continue"],
  // Chapitre II, article 5 bis
  ["DIABETES_MONITORING", "XVI-II-5bis", 1, "Surveillance et observation du patient insulino-traité", { fullRateGroup: "art5bis" }],
  ["INSULIN_INJECTION", "XVI-II-5bis", 1, "Injection sous-cutanée d'insuline", { fullRateGroup: "art5bis" }],
  ["DIABETES_WEEKLY_75", "XVI-II-5bis", 4, "Séance hebdomadaire de surveillance, patient de plus de 75 ans", { fullRateGroup: "art5bis" }],
  ["DIABETIC_COMPLEX_DRESSING", "XVI-II-5bis", 4, "Pansement lourd et complexe avec détersion", { fullRateGroup: "art5bis" }],
  ["DIABETIC_TOPICAL_ANALGESIA", "XVI-II-5bis", 1.1, "Analgésie topique avant pansement", { fullRateGroup: "art5bis", alwaysFullRate: true }],
  // Chapitre II, article 5 ter
  ["HF_COPD_FOLLOWUP", "XVI-II-5ter", 5.8, "Surveillance après hospitalisation pour insuffisance cardiaque ou BPCO", { noTimeSurcharge: true, note: "Quinze séances au plus" }],
  // Chapitre II, article 6
  ["COLONIC_IRRIGATION", "XVI-II-6", 4, "Irrigation colique après stomie définitive"],
  ["PERITONEAL_DIALYSIS", "XVI-II-6", 4, "Dialyse péritonéale"],
  ["CYCLER_CONNECTION", "XVI-II-6", 4, "Dialyse péritonéale par cycleur, branchement ou débranchement"],
  ["CYCLER_SURVEILLANCE", "XVI-II-6", 4, "Dialyse péritonéale par cycleur, surveillance par période de 12 h"],
  // Chapitre II, article 7
  ["POSTOP_SURVEILLANCE", "XVI-II-7", 3.9, "Surveillance post-opératoire (ambulatoire ou RAAC)", { fullRateGroup: "postop", exclusiveGroup: "postop-session" }],
  ["PERINEURAL_CATHETER", "XVI-II-7", 4.2, "Surveillance ou retrait de cathéter péri-nerveux", { fullRateGroup: "postop", exclusiveGroup: "postop-session" }],
  ["POSTOP_URINARY_CATHETER_REMOVAL", "XVI-II-7", 2, "Retrait de sonde urinaire", { fullRateGroup: "postop" }],
  ["REDON_DRAIN", "XVI-II-7", 2.8, "Surveillance ou retrait de drain de Redon", { fullRateGroup: "postop" }],
];

export const ACTS: readonly Act[] = ROWS.map(([code, article, coefficient, label, extra]) => ({
  code,
  article,
  coefficient,
  label,
  letter: "AMI",
  ...extra,
}));

const byCode = new Map(ACTS.map((a) => [a.code, a]));

export function findAct(code: string): Act {
  const act = byCode.get(code);
  if (!act) throw new RangeError(`Unknown act: ${code}`);
  return act;
}

/** Shortcuts to frequent acts. */
export const CATALOG = {
  BLOOD_DRAW: findAct("BLOOD_DRAW"),
  SC_INJECTION: findAct("SC_INJECTION"),
  IM_INJECTION: findAct("IM_INJECTION"),
  INSULIN_INJECTION: findAct("INSULIN_INJECTION"),
  DIABETES_MONITORING: findAct("DIABETES_MONITORING"),
  SIMPLE_DRESSING: findAct("SIMPLE_DRESSING"),
  COMPLEX_DRESSING: findAct("COMPLEX_DRESSING"),
  SHORT_PERFUSION: findAct("SHORT_PERFUSION"),
  LONG_PERFUSION: findAct("LONG_PERFUSION"),
  TOPICAL_ANALGESIA: findAct("TOPICAL_ANALGESIA"),
};
