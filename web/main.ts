import { CATALOG, formatEuros, quote, type Act, type QuoteLine } from "../src/index.js";

const ACT_LABELS: Record<string, string> = {
  BLOOD_DRAW: "Prise de sang (ponction veineuse)",
  SC_INJECTION: "Injection sous-cutanée",
  IM_INJECTION: "Injection intramusculaire",
  INSULIN_INJECTION: "Injection d'insuline",
  DIABETES_MONITORING: "Surveillance patient diabétique insulino-traité",
  SIMPLE_DRESSING: "Pansement courant",
  COMPLEX_DRESSING: "Pansement lourd et complexe",
  SHORT_PERFUSION: "Perfusion courte (surveillance continue)",
  LONG_PERFUSION: "Perfusion de plus d'une heure",
};

const SURCHARGE_LABELS: Record<string, string> = {
  MAU: "MAU",
  MCI: "MCI",
  NIGHT: "Majoration de nuit",
  DEEP_NIGHT: "Majoration de nuit profonde",
  SUNDAY_HOLIDAY: "Majoration dimanche / férié",
  IFD: "IFD",
  IK: "IK",
};

function reasonFr(line: QuoteLine): string {
  switch (line.rule) {
    case "11B_FIRST": return "Coefficient le plus élevé : tarif plein (art. 11B)";
    case "11B_SECOND": return "Deuxième acte : facturé à 50 % (art. 11B)";
    case "11B_NOT_BILLED": return "À partir du troisième acte : non facturé (art. 11B)";
    case "11B_SAME_GROUP": return "Patient insulino-traité : cumul à taux plein (dérogation art. 11B)";
    case "11B_ALWAYS_FULL": return "Prise de sang : toujours à taux plein (dérogation art. 11B)";
    case "11B_PERFUSIONS": return "Perfusions courte et longue : cumul à taux plein (dérogation art. 11B)";
    case "11B_TWO_ACTS_LIMIT": return "Avec une prise de sang, deux actes facturables au maximum";
    case "MAU": return "Majoration d'acte unique : un seul acte, coefficient ≤ 1,5";
    case "MCI": return "Majoration de coordination infirmière";
    case "NIGHT": return "Soins prescrits entre 20 h et 23 h ou entre 5 h et 8 h";
    case "DEEP_NIGHT": return "Soins prescrits entre 23 h et 5 h";
    case "SUNDAY_HOLIDAY": return "Dimanche ou jour férié (non cumulable avec la nuit)";
    case "IFD": return "Indemnité forfaitaire de déplacement, soins à domicile prescrits";
    case "IK": return `${line.km} km facturés : aller-retour moins l'abattement`;
    default: return line.reason;
  }
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const selected = new Set<string>();
const acts = Object.values(CATALOG) as Act[];

function renderActs() {
  const list = $("acts");
  list.innerHTML = "";
  for (const act of acts) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "act";
    button.setAttribute("aria-pressed", String(selected.has(act.code)));
    button.innerHTML = `<span class="check" aria-hidden="true"></span>
      <span class="act-label"></span>
      <span class="pill">${act.letter} ${String(act.coefficient).replace(".", ",")}</span>`;
    button.querySelector(".act-label")!.textContent = ACT_LABELS[act.code] ?? act.label;
    button.addEventListener("click", () => {
      if (selected.has(act.code)) selected.delete(act.code);
      else selected.add(act.code);
      button.setAttribute("aria-pressed", String(selected.has(act.code)));
      update();
    });
    li.append(button);
    list.append(li);
  }
}

function rateBadge(rate?: number) {
  if (rate === undefined) return "";
  if (rate === 1) return `<span class="rate rate-full">100 %</span>`;
  if (rate === 0.5) return `<span class="rate rate-half">50 %</span>`;
  return `<span class="rate rate-zero">non facturé</span>`;
}

function update() {
  const home = $<HTMLInputElement>("home").checked;
  $("travel").hidden = !home;

  const dateTime = $<HTMLInputElement>("dateTime").value || defaultDateTime();
  const terrain = (document.querySelector<HTMLInputElement>('input[name="terrain"]:checked')?.value ?? "plain") as "plain" | "mountain";
  const distance = Number($<HTMLInputElement>("distance").value) || 0;

  const chosen = acts.filter((a) => selected.has(a.code));
  const count = chosen.length;
  $("acts-count").textContent = count === 0 ? "Aucun acte" : `${count} acte${count > 1 ? "s" : ""}`;

  const lines = $("lines");
  lines.innerHTML = "";

  if (count === 0) {
    lines.innerHTML = `<li class="empty">Sélectionnez au moins un acte pour voir la cotation.</li>`;
    setTotal(0);
    return;
  }

  const q = quote({
    acts: chosen,
    dateTime,
    nightCarePrescribed: $<HTMLInputElement>("night").checked,
    publicHoliday: $<HTMLInputElement>("holiday").checked,
    coordination: $<HTMLInputElement>("coordination").checked,
    homeVisitPrescribed: home,
    trip: home ? { distanceKm: distance, terrain, sameAgglomeration: $<HTMLInputElement>("sameAgglo").checked } : undefined,
  });

  for (const line of q.lines) {
    const li = document.createElement("li");
    li.className = `line${line.rate === 0 ? " zero" : ""}`;
    const title = line.coding
      ? `${ACT_LABELS[line.code] ?? line.label} <span class="pill">${line.coding.replace(".", ",")}</span>`
      : SURCHARGE_LABELS[line.code] ?? line.label;
    li.innerHTML = `<span class="line-title">${title} ${rateBadge(line.rate)}</span>
      <span class="line-amount">${formatEuros(line.amountCents)}</span>
      <span class="line-reason"></span>`;
    li.querySelector(".line-reason")!.textContent = reasonFr(line);
    lines.append(li);
  }

  const [y, m, d] = q.date.split("-");
  $("tariff-date").textContent = `Tarifs au ${d}/${m}/${y}`;
  setTotal(q.totalCents);
}

function setTotal(cents: number) {
  $("total").textContent = formatEuros(cents);
  $("bar-total").textContent = formatEuros(cents);
}

function defaultDateTime() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

$<HTMLInputElement>("dateTime").value = defaultDateTime();
renderActs();
document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", update);
  input.addEventListener("change", update);
});
update();
