// node worker/test.mjs — the chat's tool must agree with the dashboard's numbers.
import assert from "node:assert/strict";
import { corpus, queryPoints, checkAnswer, SYSTEM } from "./src/tools.js";

const ch = corpus.challenge;
// The dashboard's envelope: O2 >= 30 %, suit floor <= p <= 10.2 psi * (1 + tol).
const env = queryPoints({ o2_min_pct: ch.o2_frac * 100, p_min_bar: ch.suit_pressure_bar,
                          p_max_bar: ch.pressure_bar * (1 + ch.tolerance) });
assert.deepEqual(env.by_phase, ch.envelope, "envelope by phase");
assert.equal(env.matched, ch.envelope_total);
assert.deepEqual(env.by_phase, { gas: 66, droplet: 17 });

const solid = queryPoints({ phase: "solid" });
assert.equal(solid.matched, 264);
assert.equal(solid.with_pressure, 252);
assert.equal(solid.o2_range_pct[1], Math.round(corpus.pillars.prevention.solid_ceiling * 1000) / 10);
assert.equal(queryPoints({ phase: "solid", o2_min_pct: 30 }).matched, 0);
assert.equal(queryPoints({ investigation: "bass" }).by_investigation["PSI-26"] > 0, true);
assert.ok(queryPoints({ investigation: "nope" }).error);

const c = checkAnswer("BASS [PSI-26] says [Q:PSI-26.objective]; fake [PSI-999] [Q:PSI-26.made_up]");
assert.deepEqual(c.unknown_investigations, ["PSI-999"]);
assert.deepEqual(c.unknown_quotes, ["PSI-26.made_up"]);
assert.ok(SYSTEM.includes("[Q:PSI-26.objective]"));
assert.ok(SYSTEM.includes('"by_investigation":{"PSI-10":18,"PSI-159":48,"PSI-69":17}'), "envelope split in prompt");
assert.deepEqual(checkAnswer('Nawet \u201eNomex nie zapłonął\u201d [PSI-25]').unverified_free_quotes, ["Nomex nie zapłonął"]);
const f = checkAnswer('BRE: "The chamber pressures were also varied but are not identified in this summary table." [PSI-20] and PSI-69 \u201ethis sentence is not anywhere in it\u201d');
assert.deepEqual(f.cited_investigations, ["PSI-20", "PSI-69"], "bare ids count");
assert.equal(f.free_quotes, 2);
assert.deepEqual(f.unverified_free_quotes, ["this sentence is not anywhere in it"]);
// A short "word" must not pair its closing mark with the next quote's opening.
assert.deepEqual(checkAnswer('they would be "looking" for something [Q:EARTH.smoke]. Then "x" ok').unverified_free_quotes, []);
assert.deepEqual(checkAnswer('"they would be looking for something different than they should"').unverified_free_quotes, []);
assert.deepEqual(checkAnswer('"the implication is that terrestrial standards for inert gas suppressants in low gravity do not offer the same margin"').unverified_free_quotes, []);
import { tidy } from "./src/tools.js";
assert.equal(tidy("[Q:PSI-25.varied, Q:PSI-25.conclusion] [PSI-25, PSI-26]"), "[Q:PSI-25.varied][Q:PSI-25.conclusion] [PSI-25][PSI-26]");

console.log(`ok — envelope ${JSON.stringify(env.by_phase)}, solid ceiling ${solid.o2_range_pct[1]}%, prompt ${SYSTEM.length} chars`);

// The tool loop, against a stand-in model: one query, then an answer.
import { ask } from "./src/index.js";
const calls = [];
const fake = async (req) => {
  calls.push(structuredClone(req.messages));
  if (calls.length === 1) return { model: "m", choices: [{ finish_reason: "tool_calls", message: { role: "assistant", content: null,
    tool_calls: [{ id: "t1", type: "function", function: { name: "query_points", arguments: '{"phase":"solid","o2_min_pct":30}' } },
                 { id: "t2", type: "function", function: { name: "query_points", arguments: "{bad json" } }] } }] };
  return { model: "m", choices: [{ finish_reason: "stop", message: { role: "assistant", content: "None [PSI-26] [Q:PSI-26.objective]" } }] };
};
const out = await ask(fake, "solids at 30%?", "pl");
assert.equal(out.queries, 2);
assert.equal(calls[0][0].role, "system");
assert.match(calls[0][1].content, /^Answer in Polish/);
assert.equal(JSON.parse(calls[1][3].content).matched, 0, "tool result fed back");
assert.ok(JSON.parse(calls[1][4].content).error, "bad arguments answered, not thrown");
assert.deepEqual(out.check.unknown_quotes, []);
console.log("ok — tool loop");

// ---- what changed on 2026-11-14 -------------------------------------------
import { IN_PERCENT, numbersIn, parseRanking, rankPrompt } from "./src/tools.js";
import { rank, reviewAnswer, REQUEST } from "./src/index.js";
const pv = corpus.pillars.prevention;
// The prompt hands the model oxygen in percent, and names the ceiling's test.
assert.equal(IN_PERCENT.solid_ceiling_pct, Math.round(pv.solid_ceiling * 1000) / 10);
assert.equal(pv.solid_ceiling_at.investigation, "PSI-26", "the ceiling is a BASS row, not BASS-II");
assert.ok(SYSTEM.includes(`"solid_ceiling_pct":${pv.solid_ceiling_pct}`));
assert.ok(/atmosphere \(pressure or oxygen level\) for a pressurized rover, a Mars habitat or a transit cabin/.test(SYSTEM), "no invented rover/Mars atmosphere");
assert.ok(/never as a fraction/.test(SYSTEM) && /solid_ceiling_from/.test(SYSTEM) && /query_points call you made/.test(SYSTEM));
// Speed settings: reasoning off, a cap that still fits the longest preset.
assert.deepEqual(REQUEST.reasoning, { enabled: false });
assert.ok(REQUEST.max_tokens >= 3000 && REQUEST.max_tokens <= 4000);
// Number parsing, both languages.
assert.deepEqual(numbersIn("1,936 points, 1 936 punktów, 22,7% and 22.7% [PSI-26] O2 CO2 in 2015").map((x) => x.alts), [[1936, 1.936], [1936], [22.7], [22.7]]);
// A Polish decimal with three digits is not a thousands group.
assert.deepEqual(numbersIn("0,565–3,058 bar").map((x) => x.alts), [[0.565], [3058, 3.058]]);
assert.deepEqual(checkAnswer("ciśnienie 0,983–1,026 bar, sufit 22,7% [PSI-26]").unsourced_numbers, []);
// Oxygen as a fraction is caught; a pressure in bar is not.
assert.deepEqual(checkAnswer("the ceiling is 0.2272 [PSI-26]").fraction_oxygen, ["0.2272"]);
assert.deepEqual(checkAnswer("envelope 0.2965–0.738 bar, floor 0.2965 bar").fraction_oxygen, []);
// A number in neither the summary nor a tool result is flagged; one in a tool result is not.
assert.deepEqual(checkAnswer("solids stop at 22.7% after 264 points").unsourced_numbers, []);
assert.deepEqual(checkAnswer("about 4817 tests").unsourced_numbers, ["4817"]);
assert.deepEqual(checkAnswer("about 4817 tests", '{"matched":4817}').unsourced_numbers, []);
// The correction turn fires only when needed.
assert.equal(reviewAnswer("solids stop at 22.7% [PSI-26]", ""), null);
assert.match(reviewAnswer("solids stop at 0.2272 [PSI-26]", ""), /percentage with one decimal/);
assert.match(reviewAnswer("about 4817 tests", ""), /4817/);
// ...and the loop runs it once: a fraction draft is sent back, the fix is kept.
const drafts = ["Ceiling 0.2272 [PSI-26]", "Ceiling 22.7% [PSI-26]"];
const seen2 = [];
const fake2 = async (req) => { seen2.push(req.messages.length);
  return { model: "m", choices: [{ finish_reason: "stop", message: { role: "assistant", content: drafts[seen2.length - 1] } }] }; };
const out2 = await ask(fake2, "ceiling?", "en");
assert.equal(out2.answer, "Ceiling 22.7% [PSI-26]");
assert.equal(out2.reviewed, true);
assert.equal(seen2.length, 2);

// Mission ranking: ids must exist, appear once, and reasons must pass checkAnswer.
assert.ok(rankPrompt("pressurized rover", "pl").includes("Polish"));
const good = parseRanking('```json\n{"ranking":[{"id":"PSI-26","why":"Solid samples up to 22.7% O₂ [PSI-26]."},{"id":"psi-69","why":"Droplets near the design pressure."}]}\n```');
assert.equal(good.ok, true);
assert.deepEqual(good.ranking.map((r) => r.id), ["PSI-26", "PSI-69"]);
for (const [bad, why] of [
  ['{"ranking":[{"id":"PSI-999","why":"x y"}]}', /unknown id/],
  ['{"ranking":[{"id":"PSI-26","why":"a b"},{"id":"PSI-26","why":"c d"}]}', /twice/],
  ['{"ranking":[{"id":"PSI-26","why":"see [PSI-998]"}]}', /not in the corpus/],
  ['{"ranking":[{"id":"PSI-26","why":"as \\"this sentence was never written anywhere\\" says"}]}', /not in the corpus/],
  ['{"ranking":[{"id":"PSI-26","why":"ceiling 0.2272"}]}', /fraction/],
  ['{"ranking":[{"id":"PSI-26","why":""}]}', /empty reason/],
  ['{"ranking":[]}', /empty ranking/],
  ["not json", /not valid JSON/],
]) {
  const p = parseRanking(bad);
  assert.equal(p.ok, false, bad);
  assert.equal(p.ranking, null);
  assert.match(p.errors.join("; "), why, bad);
}
// rank(): one bad draft is sent back once; a second bad one becomes an error, never a half list.
let n3 = 0;
const fake3 = (replies) => async () => ({ model: "m", choices: [{ finish_reason: "stop", message: { role: "assistant", content: replies[n3++] } }] });
n3 = 0;
const r1 = await rank(fake3(['{"ranking":[{"id":"PSI-999","why":"x"}]}', '{"ranking":[{"id":"PSI-26","why":"Solids [PSI-26]."}]}']), "rover", "en");
assert.deepEqual(r1.ranking, [{ id: "PSI-26", why: "Solids [PSI-26]." }]);
n3 = 0;
const r2 = await rank(fake3(['{"ranking":[{"id":"PSI-999","why":"x"}]}', '{"ranking":[{"id":"PSI-999","why":"x"}]}']), "rover", "en");
assert.equal(r2.error, "invalid_ranking");
assert.equal(r2.ranking, undefined);
console.log("ok — percent rule, number check, correction turn, mission ranking");

// Saved fallback answers (app/data/ask_cache.js): every one must still pass the
// same check the live panel applies, or it does not belong in the file.
import fs from "node:fs";
const cachePath = new URL("../app/data/ask_cache.js", import.meta.url);
if (fs.existsSync(cachePath)) {
  const src = fs.readFileSync(cachePath, "utf8");
  const C = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));
  let n = 0;
  for (const [key, e] of Object.entries(C.ask || {})) {
    const c = checkAnswer(e.answer);
    assert.equal(c.unknown_investigations.length + c.unknown_quotes.length + c.unverified_free_quotes.length, 0, `cache ${key}: unresolved citation`);
    assert.deepEqual(c.fraction_oxygen, [], `cache ${key}: oxygen as a fraction`);
    assert.ok(e.model && e.saved && !e.truncated, `cache ${key}: model, date, complete`);
    n++;
  }
  for (const [key, e] of Object.entries(C.rank || {})) {
    const p = parseRanking(JSON.stringify({ ranking: e.ranking }));
    assert.equal(p.ok, true, `cache rank ${key}: ${p.errors.join("; ")}`);
    assert.ok(e.model && e.saved, `cache rank ${key}: model and date`);
    n++;
  }
  console.log(`ok — ${n} saved fallback answers pass the live check`);
}
