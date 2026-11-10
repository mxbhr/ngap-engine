export { ACTS, ARTICLES, CATALOG, findAct, type Act, type ArticleInfo } from "./acts.js";
export { quote, formatEuros, type Quote, type QuoteLine, type Session } from "./quote.js";
export { applyArticle11B, findConflicts, type RatedAct, type CumulationRule, type Conflict } from "./rules/cumulation.js";
export { computeSurcharges, type SurchargeContext, type SurchargeLine } from "./rules/surcharges.js";
export { billableKm, dailyMileage, type Trip, type Terrain, type MileageLine } from "./rules/travel.js";
export { LETTER_KEYS, FLAT_FEES, letterKeyCents, flatFeeCents, valueAt } from "./tariffs.js";
