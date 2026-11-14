// Pure functions behind "Ask IGNIS": the data tool the model calls, the system
// prompt it reads, and the check every answer passes before it reaches the page.
// No network here, so `node worker/test.mjs` exercises all of it.
import corpus from "./corpus.json" with { type: "json" };

export { corpus };

const IDS = new Set(corpus.investigations.map((r) => r.id));
const BY_ACRONYM = new Map(corpus.investigations.map((r) => [r.acronym.toLowerCase(), r.id]));

// Raw counts only. Verdicts (covered / not covered) live in corpus.challenge,
// .lunar and .pillars, computed once by build_dataset.py, so the chat cannot
// invent a second definition of the envelope.
export const QUERY_TOOL = {
  name: "query_points",
  description:
    "Filter the 1,936 normalized PSI test points and return counts, ranges and a few sample rows. " +
    "Use it for any number you state that is not already in the corpus summary. " +
    "Oxygen is in percent, pressure in bar (1 atm = 1.013 bar, 10.2 psi = 0.703 bar). " +
    "Points with no recorded oxygen or pressure are excluded whenever that bound is given.",
  input_schema: {
    type: "object",
    properties: {
      investigation: { type: "string", description: "PSI id (e.g. PSI-26) or acronym (e.g. BASS). Omit for all." },
      phase: { type: "string", enum: ["gas", "droplet", "solid", "aerosol", "emulator", "dust"] },
      o2_min_pct: { type: "number" },
      o2_max_pct: { type: "number" },
      p_min_bar: { type: "number" },
      p_max_bar: { type: "number" },
      material_contains: { type: "string", description: "Case-insensitive substring of the material or fuel name." },
    },
    additionalProperties: false,
  },
};

const pct = (x) => Math.round(x * 1000) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

export function queryPoints(args = {}) {
  let inv = args.investigation;
  if (inv) {
    inv = IDS.has(inv.toUpperCase()) ? inv.toUpperCase() : BY_ACRONYM.get(inv.toLowerCase());
    if (!inv) return { error: `unknown investigation "${args.investigation}"`, known: [...IDS] };
  }
  const mat = args.material_contains?.toLowerCase();
  const rows = corpus.testpoints.filter((t) => {
    if (inv && t.i !== inv) return false;
    if (args.phase && t.ph !== args.phase) return false;
    if (args.o2_min_pct != null && !(t.o2 != null && t.o2 * 100 >= args.o2_min_pct - 1e-9)) return false;
    if (args.o2_max_pct != null && !(t.o2 != null && t.o2 * 100 <= args.o2_max_pct + 1e-9)) return false;
    if (args.p_min_bar != null && !(t.p != null && t.p >= args.p_min_bar - 1e-9)) return false;
    if (args.p_max_bar != null && !(t.p != null && t.p <= args.p_max_bar + 1e-9)) return false;
    if (mat && !`${t.m} ${t.fu}`.toLowerCase().includes(mat)) return false;
    return true;
  });
  const tally = (key) => rows.reduce((acc, t) => ((acc[key(t)] = (acc[key(t)] || 0) + 1), acc), {});
  const range = (key) => {
    const v = rows.map(key).filter((x) => x != null);
    return v.length ? [Math.min(...v), Math.max(...v)] : null;
  };
  const o2 = range((t) => t.o2), p = range((t) => t.p);
  return {
    matched: rows.length,
    by_investigation: tally((t) => t.i),
    by_phase: tally((t) => t.ph),
    with_o2: rows.filter((t) => t.o2 != null).length,
    with_pressure: rows.filter((t) => t.p != null).length,
    o2_range_pct: o2 && o2.map(pct),
    p_range_bar: p && p.map(r3),
    materials: Object.entries(tally((t) => t.m || t.fu || "(none)")).sort((a, b) => b[1] - a[1]).slice(0, 10),
    outcomes: tally((t) => t.o || "(not recorded)"),
    sample: rows.slice(0, 6).map(({ x, ...t }) => t),
  };
}

// The dashboard's envelope, spelled out with its per-investigation split so the
// model never narrows or widens it on its own.
const CH = corpus.challenge;
export const ENVELOPE = { o2_min_pct: CH.o2_frac * 100, p_min_bar: CH.suit_pressure_bar,
                          p_max_bar: r3(CH.pressure_bar * (1 + CH.tolerance)) };
const env = queryPoints(ENVELOPE);
const PV = corpus.pillars.prevention, LU = corpus.lunar;
// The headline oxygen figures already in percent, one decimal. The rest of the
// summary stores oxygen as a fraction (0.2272); handed only that, the model once
// wrote the ceiling as "0.2272". Every value here is derived, none is typed.
export const IN_PERCENT = {
  solid_ceiling_pct: PV.solid_ceiling_pct,
  solid_ceiling_from: `${PV.solid_ceiling_at.acronym} [${PV.solid_ceiling_at.investigation}] row ${PV.solid_ceiling_at.row}, ${PV.solid_ceiling_at.material}, ${PV.solid_ceiling_at.pressure_bar} bar`,
  challenge_o2_pct: pct(CH.o2_frac),
  challenge_gap_pp: CH.gap_pp,
  artemis_nominal_o2_pct: pct(LU.target_o2_frac), artemis_nominal_gap_pp: LU.gap_nominal_pp,
  artemis_capability_o2_pct: pct(LU.alternate.o2_frac), artemis_capability_gap_pp: LU.gap_capability_pp,
  bre_o2_pct: PV.bre_o2_pct,
};
const SUMMARY = JSON.stringify({
  oxygen_in_percent: IN_PERCENT,
  meta: corpus.meta, funnel: corpus.funnel, challenge: corpus.challenge,
  challenge_envelope: { definition: ENVELOPE, points: env.matched, by_phase: env.by_phase,
                        by_investigation: env.by_investigation },
  lunar: corpus.lunar, pillars: corpus.pillars,
  // Which accession each pillar figure comes from. Without this a live answer
  // credited the FLEX droplet cohorts (39/43 N2 extinctions) to BASS solids.
  pillar_sources: {
    "prevention.solid_*": "all solid-phase test points (PSI-25, PSI-26, PSI-98, PSI-99, PSI-100)",
    "prevention.bre_*": "PSI-20 BRE burning-rate emulator (gas burner, not a solid)",
    "suppression.N2 / CO2 / He": "PSI-69 FLEX liquid droplets at 1 atm; air = 20.5-21.5% O2, low = <=18% O2. Not solids.",
    "suppression.solid_notes": "PSI-26 BASS operator notes on solid samples",
    "detection.*": "keyed by accession (SAME-R PSI-101, SAME PSI-102, DAFT PSI-47)",
  },
  bre: corpus.bre, investigations: corpus.investigations,
});
const QUOTES = Object.entries(corpus.quotes).map(([id, v]) => `[Q:${id}] (${v.f}${v.ext ? "; NASA 2015 guide, outside the PSI archive, describes plans or early results" : ""}) ${v.q}`).join("\n");

// Frozen: no dates, no per-request text, so the prompt cache holds across questions.
export const SYSTEM = `You are IGNIS, the analysis layer of a dashboard over NASA's Physical Science Informatics (PSI) microgravity combustion archive. You summarize, rank and interpret these investigations to give fire-safety insight for crewed spacecraft, stations, lunar and Martian bases and pressurized rovers.

Rules:
- Every factual claim cites its source inline, always in square brackets: an investigation as [PSI-26], a verified document quote as [Q:PSI-26.objective]. Only ids listed below exist; never invent one, and never put anything else in square brackets (no field names). For a listed quote, cite its [Q:...] id and do not retype the sentence: the page prints it.
- You may also quote other text that appears verbatim in the corpus summary (for example a table "note"), in English, inside double quotes, followed by its [PSI-xx]. Every quoted string is machine-checked against the corpus; a paraphrase or translation in quotes is flagged as unverified, so in a Polish answer leave quotations in English or do not use quotation marks.
- Numbers come from the corpus summary or from query_points. Any count, range or level that is not written in the corpus summary must come from a query_points call you made for this answer: call the tool first, then state the number. If neither gives it, say the archive does not record it. Do not fill gaps from general knowledge; you may name what general knowledge would suggest only if you label it as outside the PSI data.
- Oxygen is always written as a percentage with one decimal place (22.7%, 30.0%, 26.5%), never as a fraction (never 0.2272 or 0.227). The summary stores most oxygen values as fractions; oxygen_in_percent gives the headline ones already converted, use those.
- No source here gives an atmosphere (pressure or oxygen level) for a pressurized rover, a Mars habitat or a transit cabin. When a question involves one of them, never state, assume or imply its atmosphere (not "near one atmosphere", not "the rover design point"); say once that it is not given, and rank or compare only by what the tests themselves cover. Do not mention this when the question is about something else.
- The solid-material oxygen ceiling is one test: attribute it to the investigation named in oxygen_in_percent.solid_ceiling_from, and to no other investigation.
- "The challenge atmosphere" means exactly challenge_envelope.definition: O2 >= 30%, pressure from the 4.3 psi suit floor (0.2965 bar) up to 10.2 psi plus tolerance (0.738 bar). Its counts are in challenge_envelope; use them as given and never narrow or widen the window yourself. "lunar" holds the separate Artemis design-point analysis (10.2 psia / 26.5% O2).
- When ranking, say what you ranked by (oxygen reach, pressure reach, material class, row count) and why that criterion matters for the habitat asked about.
- Be concise: at most about 180 words unless the user asks for more. Plain text with short paragraphs, "-" bullets and **bold** only. Answer in the language the user requests.

Corpus summary (computed by build_dataset.py, the same numbers the dashboard draws):
${SUMMARY}

Verified quotes (each sentence was re-found in the named PSI file by verify_insights.py):
${QUOTES}`;

// Every tag in an answer must point at something real. Unknown ones are
// reported back so the page can mark them instead of rendering them as sources.
const norm = (x) => x.replace(/\s+/g, " ").trim();
// Quote marks and letter case are not words; the words and their order still have to match.
const bare = (x) => norm(x.replace(/["\u201c\u201d\u201e\u2018\u2019']/g, "")).toLowerCase();
const HAYSTACK = bare(SYSTEM);

// The model sometimes packs several ids in one bracket: [Q:A, Q:B] or [PSI-1, PSI-2].
// Split them so every id is checked and rendered on its own.
export const tidy = (text) => text
  .replace(/\[Q:([^\]]*,[^\]]*)\]/g, (m, ids) => ids.split(/,\s*(?:Q:)?/).map((id) => `[Q:${id.trim()}]`).join(""))
  .replace(/\[(PSI-\d+(?:,\s*PSI-\d+)+)\]/g, (m, ids) => ids.split(/,\s*/).map((id) => `[${id}]`).join(""));

// Numbers in prose, in either language: "1,936" and "1 936" are one number,
// "22,7" is a Polish decimal. Ids, chemical formulas and years are not claims.
export function numbersIn(text) {
  const t = text.replace(/\[(?:Q:)?[^\]]*\]/g, " ").replace(/\bPSI-\d+\b/g, " ")
    .replace(/\b[A-Za-z]+\d[A-Za-z\d]*\b/g, " ").replace(/[₀-₉]/g, "");
  const out = [];
  for (const m of t.matchAll(/(?<![\w.,])[1-9]\d{0,2}(?:[   ]\d{3})+(?![\d.,]\d)|\d+(?:[.,]\d+)*/g)) {
    const raw = m[0];
    // "1 936" is grouped; "1,936" is English grouping or, in Polish, 1.936 —
    // so a lone comma before exactly three digits keeps both readings.
    const alts = /[   ]/.test(raw) ? [Number(raw.replace(/[   ]/g, ""))]
      : /^[1-9]\d{0,2}(,\d{3})+$/.test(raw) ? [Number(raw.replace(/,/g, "")), Number(raw.replace(",", "."))]
      : [Number(raw.replace(",", "."))];
    if (!Number.isFinite(alts[0])) continue;
    const n = alts[0];
    if (alts.length === 1 && Number.isInteger(n) && (n <= 12 || (n >= 1950 && n <= 2030))) continue;
    out.push({ raw, alts });
  }
  return out;
}
// Every number a source text holds, plus the forms an honest answer turns it
// into: a fraction as a percentage, and the usual roundings.
export function knownNumbers(src) {
  const k = new Set();
  for (const m of src.matchAll(/\d+(?:\.\d+)?/g)) {
    const x = Number(m[0]);
    for (const v of [x, x * 100]) for (const d of [0, 1, 2, 3]) k.add(Math.round(v * 10 ** d) / 10 ** d);
  }
  return k;
}
const KNOWN = knownNumbers(SYSTEM);
// Oxygen written as a fraction: 0.2272 instead of 22.7%. Pressures in bar look
// the same, so a value followed by a pressure unit is not flagged.
// A unit within the next few characters ("0.2965-0.738 bar") also counts.
const FRACTION_O2 = /(?<![\d.,])0[.,][1-4]\d{1,3}(?![\d])(?![^%\n]{0,16}?(?:bar|atm|psi|kPa|mm|cm|m\/s|mg|\bs\b|\bg\b))/g;

export function checkAnswer(text, toolText = "") {
  const q = [...text.matchAll(/\[Q:([^\]]*)\]/g)].map((m) => m[1]);
  const psi = [...text.replace(/\[Q:[^\]]*\]/g, "").matchAll(/\bPSI-\d+\b/g)].map((m) => m[0]);
  // Free quotes: pair every opening mark with the next closing one, so a short
  // "word" cannot leave its closing mark to be read as the next opening; then
  // check the spans of 12+ characters.
  const free = [...text.matchAll(/["\u201c\u201e]([^"\u201c\u201d\u201e]*)["\u201d\u201c]/g)]
    .map((m) => norm(m[1]).replace(/[\s,.;:]+$/, "")).filter((x) => x.length >= 12);
  const known = toolText ? new Set([...KNOWN, ...knownNumbers(toolText)]) : KNOWN;
  const near = (n) => known.has(n) || known.has(Math.round(n * 10) / 10);
  return {
    // Numbers found neither in the summary nor in a query_points result of this
    // answer. Reported, not hidden: the loop asks the model once to source them.
    unsourced_numbers: [...new Set(numbersIn(text).filter((x) => !x.alts.some(near)).map((x) => x.raw))],
    fraction_oxygen: [...new Set([...text.matchAll(FRACTION_O2)].map((m) => m[0]))],
    free_quotes: free.length,
    unverified_free_quotes: free.filter((x) => !HAYSTACK.includes(bare(x))),
    cited_investigations: [...new Set(psi)],
    cited_quotes: [...new Set(q)],
    unknown_investigations: [...new Set(psi.filter((id) => !IDS.has(id)))],
    unknown_quotes: [...new Set(q.filter((id) => !(id in corpus.quotes)))],
  };
}

// ---- mission ranking (the Atlas "Describe the mission" field) --------------
const RANKABLE = corpus.investigations.filter((r) => r.raw_rows > 0).map((r) => r.id);
export const rankPrompt = (mission, lang) =>
  `Mission described by the user: ${JSON.stringify(mission)}\n\n` +
  "Rank the PSI investigations by how much each one tells the designer of this mission about fire safety " +
  "(oxygen and pressure reach, material class, what was measured). " +
  "Return ONLY one JSON object, no prose and no code fence, in exactly this shape: " +
  '{"ranking":[{"id":"PSI-26","why":"one sentence"}]}. ' +
  `Use only these ids: ${RANKABLE.join(", ")}. Each id at most once; list between 5 and 10. ` +
  `Each "why" is one sentence in ${lang === "pl" ? "Polish" : "English"}, at most 35 words, ` +
  "uses no quotation marks, may cite [PSI-xx] ids only, writes oxygen as a percentage with one decimal, " +
  "and uses only numbers from the corpus summary or a query_points result.";

// Parse and validate a ranking. Anything that does not pass is rejected whole:
// the page then falls back to the rule-based order instead of half a list.
export function parseRanking(text, toolText = "") {
  const errors = [];
  let obj = null;
  const s = text.replace(/```(?:json)?/g, "");
  try { obj = JSON.parse(s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1)); } catch { errors.push("not valid JSON"); }
  const list = obj && Array.isArray(obj.ranking) ? obj.ranking : null;
  if (obj && !list) errors.push('no "ranking" array');
  const seen = new Set();
  const agg = { unknown_investigations: [], unknown_quotes: [], unverified_free_quotes: [], fraction_oxygen: [], unsourced_numbers: [] };
  (list || []).forEach((it, n) => {
    const id = String(it?.id || "").trim().toUpperCase();
    const why = String(it?.why || "").trim();
    if (!IDS.has(id)) errors.push(`item ${n + 1}: unknown id ${JSON.stringify(it?.id)}`);
    else if (!RANKABLE.includes(id)) errors.push(`item ${n + 1}: ${id} has no test table`);
    if (seen.has(id)) errors.push(`item ${n + 1}: ${id} listed twice`);
    seen.add(id);
    if (!why) errors.push(`item ${n + 1}: empty reason`);
    if (why.length > 400) errors.push(`item ${n + 1}: reason too long`);
    const c = checkAnswer(why, toolText);
    for (const k of Object.keys(agg)) agg[k].push(...c[k]);
    if (c.unknown_investigations.length || c.unknown_quotes.length || c.unverified_free_quotes.length)
      errors.push(`item ${n + 1}: reason cites something that is not in the corpus`);
    if (c.fraction_oxygen.length) errors.push(`item ${n + 1}: oxygen written as a fraction`);
  });
  if (list && !list.length) errors.push("empty ranking");
  return {
    ok: !errors.length,
    errors,
    ranking: errors.length ? null : list.map((it) => ({ id: String(it.id).trim().toUpperCase(), why: String(it.why).trim() })),
    check: agg,
  };
}
