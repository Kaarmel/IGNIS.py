// "Ask IGNIS": a Cloudflare Worker that holds the OpenRouter key, lets the
// model query the PSI test points, and checks every cited source before answering.
import { SYSTEM, QUERY_TOOL, queryPoints, NEAREST_TOOL, nearestEvidence, checkAnswer, tidy, rankPrompt, parseRanking } from "./tools.js";

export const MODEL = "deepseek/deepseek-v4.1-flash-1017";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MAX_QUESTION = 600;
const MAX_MISSION = 200;
const MAX_TURNS = 5; // tool round-trips before we stop and say so
// Generation settings, one place. REQUEST is spread into every model call.
// Measured on the five presets (2026-11-14, one run per preset): with the
// model's reasoning mode on and max_tokens 8000 the deployed worker took
// 3.8-11.8 s (5-34 s in a local run) and two of five made no data query; with
// reasoning off it took 2.7-7.6 s and four of five queried the points; after
// the last prompt changes, 3.3-6.4 s with all five querying. The 4000-token cap leaves
// room for the longest preset (Rank, ~1,400 characters).
// One provider, no fallback: OpenRouter otherwise routes each call to whichever
// host is up, and one of eleven calls on 2026-11-14 took 26 s. Pinning keeps the
// latency predictable; if inference-net is down the page shows its saved answer.
export const PROVIDER = { only: ["inference-net/us"], allow_fallbacks: false };
export const REQUEST = { max_tokens: 4000, reasoning: { enabled: false }, provider: PROVIDER };

const TOOLS = [QUERY_TOOL, NEAREST_TOOL].map((t) => ({ type: "function", function: {
  name: t.name, description: t.description, parameters: t.input_schema } }));
const RUN = { [QUERY_TOOL.name]: queryPoints, [NEAREST_TOOL.name]: nearestEvidence };

function cors(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

// `complete` takes the request body and returns the parsed OpenRouter response;
// injected so test.mjs can run the loop without the network.
export function openRouter(apiKey, fetchFn = fetch) {
  return async (body) => {
    const r = await fetchFn(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "IGNIS" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data?.error?.message || `HTTP ${r.status}`), { status: r.status });
    return data;
  };
}

// The tool loop shared by questions and rankings. `review(text, toolText)`
// may return a follow-up instruction once; the model then gets one more turn.
// `step(event)` reports progress (what the worker is doing now) to a streaming client.
async function loop(complete, messages, review, step = () => {}) {
  let queries = 0, reviewed = false, toolText = "";
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (turn === 0) step({ stage: "think" });
    else if (messages[messages.length - 1].role === "tool") step({ stage: "write" });
    const res = await complete({ model: MODEL, ...REQUEST, tools: TOOLS, messages });
    const choice = res.choices?.[0];
    if (!choice) return { error: "empty" };
    const msg = choice.message;
    messages.push(msg);
    if (!msg.tool_calls?.length) {
      const text = tidy(msg.content || "");
      if (!text.trim()) return { error: "empty" };
      step({ stage: "check" });
      const again = !reviewed && turn < MAX_TURNS - 1 && review ? review(text, toolText) : null;
      if (again) {
        reviewed = true;
        step({ stage: "fix" });
        messages.push({ role: "user", content: again });
        continue;
      }
      return { text, truncated: choice.finish_reason === "length", queries, model: res.model || MODEL, toolText, reviewed };
    }
    for (const call of msg.tool_calls) {
      queries++;
      let args;
      try { args = JSON.parse(call.function.arguments || "{}"); } catch { args = null; }
      const fn = RUN[call.function.name];
      step({ stage: call.function.name === NEAREST_TOOL.name ? "nearest" : "query", n: queries });
      const result = args && fn ? fn(args) : { error: "invalid tool call; send query_points or nearest_evidence with a JSON object" };
      const s = JSON.stringify(result);
      toolText += s + "\n";
      messages.push({ role: "tool", tool_call_id: call.id, content: s });
    }
  }
  return { error: "too_many_steps" };
}

// One correction turn, only when the draft needs it: a number that is in
// neither the summary nor a query result, or oxygen written as a fraction.
export function reviewAnswer(text, toolText) {
  const c = checkAnswer(text, toolText);
  const asks = [];
  if (c.unsourced_numbers.length) asks.push(
    `These numbers are not in the corpus summary or in any query_points result of this answer: ${c.unsourced_numbers.join(", ")}. ` +
    "Call query_points to obtain each one, or remove it.");
  if (c.quote_credited_to_other_study.length) asks.push(
    `These quotes are credited to a different investigation than the one they come from: ${c.quote_credited_to_other_study.join("; ")}. ` +
    "Name the investigation the quote id belongs to.");
  if (c.fraction_oxygen.length) asks.push(
    `Oxygen is written as a fraction here: ${c.fraction_oxygen.join(", ")}. Write it as a percentage with one decimal place.`);
  return asks.length ? asks.join(" ") + " Then give the complete answer again, nothing else, and do not mention this check or the correction." : null;
}

export async function ask(complete, question, lang, step) {
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `${lang === "pl" ? "Answer in Polish." : "Answer in English."}\n\n${question}` },
  ];
  const r = await loop(complete, messages, reviewAnswer, step);
  if (r.error) return r;
  return { answer: r.text, truncated: r.truncated, queries: r.queries, model: r.model, reviewed: r.reviewed,
           check: checkAnswer(r.text, r.toolText) };
}

// Rank the Atlas for a mission. The model returns JSON; the worker accepts it
// only if every id exists, none repeats and every reason passes checkAnswer.
export async function rank(complete, mission, lang, step) {
  const messages = [{ role: "system", content: SYSTEM }, { role: "user", content: rankPrompt(mission, lang) }];
  const r = await loop(complete, messages, (text, toolText) => {
    const p = parseRanking(text, toolText);
    return p.ok ? null : `That ranking was rejected: ${p.errors.join("; ")}. Return the corrected JSON object only.`;
  }, step);
  if (r.error) return r;
  const p = parseRanking(r.text, r.toolText);
  if (!p.ok) return { error: "invalid_ranking", detail: p.errors, model: r.model };
  return { ranking: p.ranking, queries: r.queries, model: r.model, reviewed: r.reviewed, check: p.check };
}

export default {
  async fetch(request, env) {
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, headers);

    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    if (env.ASK_LIMIT && !(await env.ASK_LIMIT.limit({ key: ip })).success) {
      return json({ error: "rate_limited" }, 429, headers);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400, headers); }
    const lang = body?.lang === "pl" ? "pl" : "en";
    const isRank = body?.mode === "rank";
    const text = String((isRank ? body?.mission : body?.question) || "").trim();
    if (!text || text.length > (isRank ? MAX_MISSION : MAX_QUESTION)) {
      return json({ error: isRank ? "bad_mission" : "bad_question" }, 400, headers);
    }

    const complete = openRouter(env.OPENROUTER_API_KEY);
    const run = async (step) => {
      try {
        return isRank ? await rank(complete, text, lang, step) : await ask(complete, text, lang, step);
      } catch (err) {
        return { error: err.status === 429 ? "busy" : "upstream", status: err.status };
      }
    };
    if (body?.stream !== true) {
      const out = await run();
      return json(out, out.error ? 502 : 200, headers);
    }
    // Streaming: one JSON object per line. Progress lines carry `stage`; the last
    // line is the same object the non-streaming call returns, plus `done: true`.
    const { readable, writable } = new TransformStream();
    const w = writable.getWriter(), enc = new TextEncoder();
    const send = (o) => w.write(enc.encode(JSON.stringify(o) + "\n")).catch(() => {});
    (async () => {
      send({ stage: "start" });
      const out = await run(send);
      await send({ ...out, done: true });
      await w.close().catch(() => {});
    })();
    return new Response(readable, { status: 200, headers: { ...headers, "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
  },
};
