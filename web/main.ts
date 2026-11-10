import { ACTS, ARTICLES, findAct, formatEuros, quote, type Act, type Conflict, type QuoteLine } from "../src/index.js";

const FREQUENT = [
  "BLOOD_DRAW", "SC_INJECTION", "IM_INJECTION", "INSULIN_INJECTION", "DIABETES_MONITORING",
  "SIMPLE_DRESSING", "COMPLEX_DRESSING", "MEDICATION_SUPERVISION", "SHORT_PERFUSION", "LONG_PERFUSION",
];

const CONFLICT_TEXT: Record<string, string> = {
  bladder: "Le cathétérisme, le changement de sonde, l'éducation à l'autosondage et la rééducation de vessie ne se cumulent pas entre eux.",
  art10: "Les actes de surveillance et d'accompagnement de la prise médicamenteuse ne se cumulent pas entre eux.",
  "perf3-removal": "Le retrait du dispositif ne se cumule pas avec la perfusion sous surveillance continue.",
  "perf4-removal": "Le retrait du dispositif ne se cumule pas avec la perfusion sous surveillance continue.",
  "postop-session": "La surveillance post-opératoire et la surveillance du cathéter péri-nerveux ne se cumulent pas.",
};

const SURCHARGE_NAMES: Record<string, string> = {
  MAU: "Majoration d'acte unique",
  MCI: "Majoration de coordination",
  NIGHT: "Majoration de nuit",
  DEEP_NIGHT: "Majoration de nuit profonde",
  SUNDAY_HOLIDAY: "Majoration dimanche et férié",
  IFD: "Indemnité de déplacement",
  IK: "Indemnités kilométriques",
};

function reason(line: QuoteLine): string {
  switch (line.rule) {
    case "11B_FIRST": return "Coefficient le plus élevé, payé en entier.";
    case "11B_SECOND": return "Deuxième acte, payé à moitié.";
    case "11B_NOT_BILLED": return "À partir du troisième acte, rien n'est payé.";
    case "11B_SAME_GROUP": return "Actes du même article, cumulables en entier.";
    case "11B_ALWAYS_FULL":
      return line.code.includes("ANALGESIA")
        ? "L'analgésie se cumule en entier avec le pansement."
        : "La prise de sang est toujours payée en entier.";
    case "11B_PERFUSIONS": return "Les deux forfaits de perfusion se cumulent en entier.";
    case "11B_TWO_ACTS_LIMIT": return "Avec une prise de sang, deux actes au plus sont payés.";
    case "MAU": return "Un seul acte de coefficient 1,5 au plus.";
    case "MCI": return "Soins palliatifs ou pansement lourd coordonnés.";
    case "NIGHT": return "Soins prescrits de 20 h à 23 h ou de 5 h à 8 h.";
    case "DEEP_NIGHT": return "Soins prescrits de 23 h à 5 h.";
    case "SUNDAY_HOLIDAY": return "Ne se cumule pas avec la majoration de nuit.";
    case "IFD": return "Soins à domicile mentionnés sur l'ordonnance.";
    case "IK": return `${line.km} km comptés : aller-retour moins l'abattement.`;
    default: return line.reason;
  }
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);

const selected: string[] = [];
let lastAdded: string | undefined;

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
/** Every word of the query must appear; trailing e/s/x are ignored ("insuline" finds "insulino-traité"). */
function matches(text: string, query: string) {
  if (!query) return true;
  const haystack = normalize(text);
  return query.split(/\s+/).every((word) => haystack.includes(word.replace(/[esx]+$/, "") || word));
}

const coding = (act: Act) => `${act.letter} ${String(act.coefficient).replace(".", ",")}`;

function articleRef(id: string) {
  const [, chapter, article] = id.split("-");
  return `chap. ${chapter}, art. ${article?.replace("bis", " bis").replace("ter", " ter")}`;
}

function actButton(act: Act) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "act";
  button.dataset.code = act.code;
  button.setAttribute("aria-pressed", String(selected.includes(act.code)));
  button.innerHTML = `<span class="box" aria-hidden="true"></span><span><span class="act-label"></span></span><span class="code">${coding(act)}</span>`;
  button.querySelector(".act-label")!.textContent = act.label;
  if (act.note) {
    const note = document.createElement("span");
    note.className = "act-note";
    note.textContent = act.note;
    button.querySelector(".act-label")!.after(note);
  }
  button.addEventListener("click", () => toggle(act.code));
  li.append(button);
  return li;
}

function section(title: string, ref: string | undefined, acts: Act[]) {
  const wrapper = document.createElement("section");
  wrapper.className = "article";
  const h = document.createElement("h3");
  h.className = "article-title";
  h.textContent = title;
  if (ref) {
    const span = document.createElement("span");
    span.className = "article-ref";
    span.textContent = ref;
    h.append(span);
  }
  const ul = document.createElement("ul");
  ul.className = "acts";
  acts.forEach((a) => ul.append(actButton(a)));
  wrapper.append(h, ul);
  return wrapper;
}

function renderCatalog() {
  const root = $("catalog");
  root.innerHTML = "";
  const q = normalize(input("search").value.trim());

  if (!q) {
    root.append(section("Les plus courants", undefined, FREQUENT.map(findAct)));
  }

  let shown = 0;
  for (const article of ARTICLES) {
    const acts = ACTS.filter(
      (a) => a.article === article.id && matches(`${a.label} ${article.title}`, q),
    );
    if (acts.length === 0) continue;
    shown += acts.length;
    root.append(section(article.title, articleRef(article.id), acts));
  }

  if (q && shown === 0) {
    const p = document.createElement("p");
    p.className = "empty-search";
    p.textContent = `Aucun acte ne correspond à « ${input("search").value.trim()} ». Essayez un mot plus court.`;
    root.append(p);
  }
}

function toggle(code: string) {
  const i = selected.indexOf(code);
  if (i >= 0) {
    selected.splice(i, 1);
    lastAdded = undefined;
  } else {
    selected.push(code);
    lastAdded = code;
  }
  document.querySelectorAll<HTMLButtonElement>(`.act[data-code="${code}"]`).forEach((b) =>
    b.setAttribute("aria-pressed", String(selected.includes(code))),
  );
  update();
}

function renderConflicts(conflicts: Conflict[]) {
  const root = $("conflicts");
  root.innerHTML = "";
  for (const c of conflicts) {
    const p = document.createElement("p");
    p.className = "conflict";
    p.setAttribute("role", "alert");
    p.textContent = CONFLICT_TEXT[c.group] ?? "Ces actes ne se cumulent pas.";
    root.append(p);
  }
}

function update() {
  const home = input("home").checked;
  document.querySelectorAll<HTMLElement>(".travel").forEach((el) => (el.hidden = !home));

  const dateTime = input("dateTime").value || nowLocal();
  const terrain = (document.querySelector<HTMLInputElement>('input[name="terrain"]:checked')?.value ?? "plain") as "plain" | "mountain";
  const distance = Number(input("distance").value) || 0;

  const acts = selected.map(findAct);
  const count = acts.length;
  $("bar-count").textContent = count === 0 ? "Aucun acte" : `${count} acte${count > 1 ? "s" : ""} sur la feuille`;
  $("clear").hidden = count === 0;

  const tbody = $("lines");
  tbody.innerHTML = "";

  const [y, m, d] = dateTime.slice(0, 10).split("-");
  $("tariff-date").textContent = `Tarifs en vigueur le ${d}/${m}/${y}`;

  if (count === 0) {
    tbody.innerHTML = `<li class="sheet-empty">Cochez les actes réalisés pendant le passage : la cotation se calcule au fur et à mesure.</li>`;
    renderConflicts([]);
    setTotal(0);
    return;
  }

  const q = quote({
    acts,
    dateTime,
    nightCarePrescribed: input("night").checked,
    publicHoliday: input("holiday").checked,
    coordination: input("coordination").checked,
    homeVisitPrescribed: home,
    trip: home ? { distanceKm: distance, terrain, sameAgglomeration: input("sameAgglo").checked } : undefined,
  });

  renderConflicts(q.conflicts);

  for (const line of q.lines) {
    const li = document.createElement("li");
    const isAct = line.coding !== undefined;
    li.className = "sheet-line";
    if (line.rate === 0) li.classList.add("unpaid");
    if (line.code === lastAdded) li.classList.add("just-added");

    const rate =
      line.rate === undefined ? "" :
      line.rate === 0 ? `<span class="stamp">Non payé</span>` :
      `<span class="rate">${line.rate === 0.5 ? "50 %" : "100 %"}</span>`;

    li.innerHTML = `
      <span class="line-name"></span>
      <span class="amount">${formatEuros(line.amountCents)}</span>
      ${isAct ? `<span class="line-meta"><span class="code">${line.coding!.replace(".", ",")}</span>${rate}</span>` : ""}
      <span class="line-reason"></span>`;
    li.querySelector(".line-name")!.textContent = isAct ? findAct(line.code).label : SURCHARGE_NAMES[line.code] ?? line.label;
    li.querySelector(".line-reason")!.textContent = reason(line);

    if (isAct) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.textContent = "Retirer";
      remove.setAttribute("aria-label", `Retirer ${findAct(line.code).label}`);
      remove.addEventListener("click", () => toggle(line.code));
      li.append(remove);
    }
    tbody.append(li);
  }

  lastAdded = undefined;
  setTotal(q.totalCents);
}

function setTotal(cents: number) {
  $("total").textContent = formatEuros(cents);
  $("bar-total").textContent = formatEuros(cents);
}

function nowLocal() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

input("dateTime").value = nowLocal();
renderCatalog();
input("search").addEventListener("input", renderCatalog);
document.querySelectorAll<HTMLInputElement>(".form-box input").forEach((el) => {
  el.addEventListener("input", update);
  el.addEventListener("change", update);
});
$("clear").addEventListener("click", () => {
  [...selected].forEach(toggle);
});
update();
