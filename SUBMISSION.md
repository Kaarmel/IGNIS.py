# IGNIS — The Oxygen Ceiling

NASA International Space Apps Challenge 2026 · **Flame in Freefall: SI-Powered Fire Safety
Insights from Microgravity Combustion Data** · Local Event: Rzeszów, 14–15 November 2026.

---

## High-Level Summary

IGNIS is an SI-powered fire-safety dashboard over NASA's microgravity combustion archive (NASA Physical
Science Informatics, PSI). It opens with what that archive tells a habitat designer to do differently, and
then with where the archive stops.

**What to do differently** — one number, one conclusion and one limit each, every number computed from the
PSI tables:

- **Suppression: test cutting the air flow first.** Of **18** BASS operator-logged attempts to put a burning solid out
  with nitrogen, **16** left the flame lit; in **10** of those the flame went out when the air flow was turned
  off. An operator log at 17.5–22.6 % O₂ on small glovebox samples, not a controlled comparison — a signal to
  test at cabin scale, not a procedure.
- **Design atmosphere: do not count on self-extinction.** **0 of 17** FLEX droplets near the 10.2 psi design
  pressure at 30–34 % O₂ self-extinguished, against **14 of 29** in the same nitrogen series at cabin air.
  Droplets, not cabin materials; both axes differ — an analogue.
- **Detection: finer smoke, slower detection.** The SAME final report finds "a substantial portion of the
  smoke particles are below 500 nm in diameter" and "detection times are longer than in normal gravity".
  The SAME tables record no oxygen or pressure.

**Where it stops — why those are analogues.** NASA's reference design for a lunar surface habitat operates at
10.2 psia (0.703 bar) with 26.5 % oxygen, and has a capability mode at 8.2 psia and 34 % (Kessler et al.,
*Artemis Deep Space Habitation*, IEEE Aerospace 2022, NTRS 20220000245); the challenge puts lunar oxygen at
30 % or more. We mapped the PSI test tables for this challenge area — 7,463 files, 5.4 GB, 2,870 published
rows across 22 tables in 20 accessions; 18 tables column-mapped, the three ACME tables CLD Flame, E-FIELD
and s-Flame (82 rows) and the summary sheet counted but not mapped — into 1,936 test points, then measured
the gap. It has three parts:

1. **Every solid-material test in the corpus stops at 22.7 % oxygen.** That is 264 points across five
   investigations — the highest of the 261 that record a level at all. The habitat's nominal level is
   26.5 %, its capability mode 34 %. **3.8 percentage points of the relevant range have no solid test in PSI
   at the nominal point, 11.3 at the capability point** — and no solid test exists within 0.03 bar of either
   design pressure. The highest point is a BASS test (PSI-26, row 55). The ceiling is not a safety limit:
   both BASS campaigns varied oxygen by diluting ISS air with nitrogen inside the Microgravity Science
   Glovebox at one atmosphere, a method that can only go down from ambient.
2. **The pressure axis is one atmosphere, not the design point.** 252 of the 264 solid points have a
   chamber pressure recorded somewhere in the corpus — 121 in the test table (BASS publishes it in its
   as-run matrix), 129 documented as cabin pressure — about 1 atm — in the BASS-II summary report, 2 in the
   Saffire-I sensor workbook (14.85–14.90 psia) — and every one of them ran at **0.9829–1.0275 bar**.
   Twelve have no pressure anywhere. The pressure axis was never varied: only the oxygen was, and only
   downward. The gap is therefore two-dimensional, and it is not a missing column: **PSI contains no
   solid-material test below 0.98 bar, and none above 22.7 % oxygen**.
3. **Pressure is not the gap at the design point — oxygen is.** 103 FLEX droplet tests ran within
   0.03 bar of it, but only **17** of them also reached 26.5 % oxygen (their range is 30–34 %). The
   droplet analogue is real, and it is not material flammability. What those 17 did:
   **none of them self-extinguished**, against **14 of 29** in the same nitrogen-diluted FLEX
   series held at cabin air (21 % O₂ ±0.5). Both axes differ between the cohorts, so this is an
   analogue, not a controlled comparison.

**The gap is in the open archive, not in all of science.** Outside PSI, SoFIE-GEL on the ISS burned 4 cm
PMMA spheres at 13–34 % O₂ and 0.15–1.1 atm (James et al., *Combustion and Flame* 277, 114244, 2025).
Its points are not in PSI, so no one building on the open archive can use them; the first step of closing
the gap is to publish them there. Ground qualification (NASA-STD-6001) runs in normal gravity, and the
corpus itself says that is not the worst case: BASS found flammability enhanced in microgravity for a
geometry that self-extinguishes in normal-gravity air (PSI-26), and BASS-II set out to compare the
microgravity worst case with "the terrestrial upward burning used to screen the materials" (PSI-25).

IGNIS is an **SI-powered fire-safety dashboard** in the sense the challenge asks for: it summarizes
(an SI summary on every documented accession, visible in the Atlas), ranks (by a stated rule, or by the SI
for a mission you describe — rover, lunar base, transit cabin) and interprets the corpus, and it is also an
evidence audit with a query interface. Describe an
atmosphere and a material class, and it returns what the evidence supports, what it does not, and how
far away the nearest real measurement is. Every figure is computed by the build scripts from the source
tables — so every number in the demo is traceable to a source row or to a quoted sentence in the
corpus. (Prose is written by hand; the numbers are not.)

---

## Project Demo

**Five-slide deck, with backup slides after it:** [`pitch/IGNIS-pitch.pdf`](pitch/IGNIS-pitch.pdf) — also viewable as
[`pitch/index.html`](pitch/index.html) (arrow keys to advance). A screen recording of the live SI answering the
*Beyond the data* preset is in [`pitch/img/demo.gif`](pitch/img/demo.gif), as a fallback if the network fails.

---

## Final Project Link

- **Repository:** https://github.com/Kaarmel/IGNIS.py
- **Demo:** https://kaarmel.github.io/IGNIS.py/ (opens the dashboard; the deck is at `/pitch/`)
- **Application:** `app/index.html` — open it directly. No build step. Only live SI (Ask IGNIS and the Atlas mission ranking) uses the network, through the Cloudflare Worker in `worker/`; without it, those show saved answers labelled with their date, and every other section works from `file://`.
- **Deck:** [`pitch/IGNIS-pitch.pdf`](pitch/IGNIS-pitch.pdf)

---

## Project Details — how it works

**1. Normalisation (the part the challenge does not hand you).** The PSI tables are not comparable as published. A
generic parser silently mis-units them:

| hazard | example in the corpus |
|---|---|
| three pressure units | atm, bar, mmHg |
| two oxygen conventions | fraction vs percent |
| free-text units | `"1 atm"` in a numeric column |
| typo'd headers | `Samle Thickness` |
| whitespace-padded headers | leading/trailing spaces in column names |
| missing-value sentinel | `***`, and a literal `0` in some columns |
| empty tail rows | 861 blank rows at the end of one sheet |

Every table is therefore mapped **explicitly** in `scripts/build_dataset.py` (`SPEC`) — one entry per
table, 22 in all; 18 carry a hand-written column map, and the three ACME tables CLD Flame, E-FIELD and
s-Flame and the summary sheet are listed with no columns, so their rows are counted and set aside by name. A row that cannot be mapped is set aside and **named**, never
silently merged, and the arithmetic is stated rather than left for a reader to reconcile: **2,870**
published rows, **959** rejected for a named cause, **1,911** rows that become test points — and
**1,936** test points, because BRE's 18 test-day rows each list several oxygen levels and become 43
points. The 959 are 861 empty rows, 82 in three ACME tables whose columns this build does not map,
8 in the cross-experiment summary sheet, and 8 Saffire rows of which 4 are pre-test
flow-visualisation records. BRE contributes 43 points and 194 flames.

**2. Measurement.** From 1,936 test points we compute the oxygen ceiling, the pressure coverage, the
distance from the lunar design point, and the per-investigation inventory shown in the Atlas.

**3. Telemetry.** Separately, `scripts/build_telemetry.py` joins the raw **125 Hz** instrument streams
to the ignition/extinction timestamps in the `_TP.txt` files, reconstructing 40 test series out of the
136 streams the test-point log can be joined to. The archives hold 370 recorded extinction events
(237 in PSI-159, 133 in PSI-10).

**4. The product.** A static single-page application — vanilla HTML/CSS/JS, no framework, no build
step. Everything but live SI runs from `file://`, which matters for a demo: if the SI endpoint is down or
slower than 25 s, the page shows a real answer recorded earlier from the live service, labelled with its
date and "not live", with a retry button; the rest of the page is unaffected.

Describe an atmosphere and a material class and the solver returns a verdict, the evidence rows behind
it, **and the experiment that would close the gap** — the oxygen band PSI holds no test for, the
pressure at which to run it, and how far the nearest real measurement sits. Every parameter in that
plan is computed from the corpus, not written by hand, so the plan is a measurement of what is
missing rather than a proposed test design. The same answer prints as a one-page evidence gap
report (`Export`, or ⌘P) in both languages — a document an engineer can carry to whoever commissions
the test.

**Tools used:** Python 3 (stdlib only — `csv`, `os`, `json`, `re`) for the build scripts; vanilla
JavaScript and SVG for the application; no runtime dependencies.

---

## How NASA data was used

All data is **NASA Physical Science Informatics (PSI)**, published under **CC0-1.0**, retrieved
through the PSI accessions for this challenge area: **22 accessions, 7,463 files, 5.4 GB**. Twenty
accessions publish an experimental test table (22 tables in all); 18 tables are column-mapped and 16
accessions yield test points. The three ACME tables CLD Flame, E-FIELD and s-Flame (82 rows) and the
summary sheet are counted but not mapped. PSI-115 and PSI-117 carry only reports, presentations and
analyzed-data files and contribute no test points.

The source files are **not redistributed in this repository** (5.4 GB, see `.gitignore`). They are
reproducible: the accessions are listed with file names and SHA-1 hashes in `data/index.json`, the
files come from the PSI API, and two build scripts regenerate every figure in the application
(`scripts/build_index.py` regenerates the index itself from a local copy; it does not download).

No NASA logo or branding is used; PSI is credited as the source throughout the application.

---

## How SI (AI) was used

Super-intelligent tools were used, as the challenge requires:

- **Claude (Anthropic)** — the normalisation and telemetry-join scripts, the application, the deck and
  this document; exploratory analysis of the PSI tables; drafting of the narrative.
- **SI read the PSI documents and extracted the summaries.** For each accession the Atlas shows an
  objective, fuel, sample, what changed between tests, sensors, apparatus and one fire-safety
  conclusion — **84 sentences lifted verbatim from the PSI reports and presentations**, plus 23 from NASA's 2015 guide (below) and written to
  `app/data/insights.js`, each stored with the file name it came from. Each of the twelve accessions
  that publish a document also carries one **SI summary** sentence stating what the study means to a
  habitat designer, printed above the quotes it is written from, so the interpretation and its evidence
  sit in one place. Eight of the twenty accessions publish only a table; six of those are now described from
  NASA's 2015 guide (below).
- **NASA's 2015 Researcher's Guide fills six table-only accessions.** PSI-20, 21, 22, 68, 69 and 106
  publish only a table. Their objective, fuel, apparatus and sensor fields — and FLEX's conclusion — now
  come from *A Researcher's Guide to: Combustion Science* (NASA, 2015), stored in `data/external/`. Each
  such cell carries `"ext": 1`, the interface prints the guide's name instead of a PSI file, and the
  verifier looks those quotes up there only. 18 of 20 accessions now state at least an objective;
  Saffire-II (not in the guide) and the summary sheet stay *"not stated"*. The *On Earth* card's four
  quotes (`app/data/earth.js`) go through the same check: 107 quotes, 0 failures.
- **Ask IGNIS, the live SI.** A panel near the top of the dashboard sends a question to a Cloudflare
  Worker (`worker/`), which runs **DeepSeek V4.1 Flash** (`deepseek/deepseek-v4.1-flash-1017`) through
  OpenRouter. The model reads a summary built by `scripts/build_dataset.py` — the same numbers the page
  draws, with the headline oxygen figures also given in percent — and queries the 1,936 test points itself
  with one tool, `query_points`, which returns raw counts only. The prompt requires a `query_points` call for
  any number not in the summary, oxygen in percent with one decimal, and the solid ceiling credited to the
  test it comes from (`pillars.prevention.solid_ceiling_at`). It cites investigations as `[PSI-26]` and
  verified quotes by id (`[Q:PSI-26.objective]`); the page prints the quote from `insights.js`. Before an
  answer is returned, every cited id and every quoted string of 12+ characters is checked against the
  corpus; a draft with oxygen written as a fraction or with a number found in neither the summary nor a
  query result is sent back once for correction. The page gives the worker 25 s, shows a seconds counter and
  a retry button.
- **SI ranks the Atlas for a mission.** Above the Atlas, "Describe the mission" (with *Pressurized rover*,
  *Lunar surface base*, *Transit cabin* buttons) asks the same worker for an ordered list of accessions with
  one reason each. The worker accepts it only if every id exists, none repeats and every reason passes the
  same `checkAnswer`; otherwise the page says so and keeps the rule-based ranking, which stays the default.
  The banner over the list says which ranking is active.
- **Saved answers, labelled as such.** `app/data/ask_cache.js` holds real answers recorded from the deployed
  worker by `scripts/capture_ask_cache.mjs` — the five preset questions and three missions, in English and
  Polish, each with its `check`, model name and date. An answer with an unresolved citation, a fraction for
  oxygen or a cut-off ending is not written. The page shows one only when the live call fails or passes
  25 s, under the label "saved answer, recorded <date> — not live"; `node worker/test.mjs` re-checks every
  stored answer.
- **Speed.** With the model's reasoning mode on and `max_tokens` 8000, the five presets (one run each) took 3.8–11.8 s
  against the deployed worker (5–34 s in a local run), and two of five made no data query. With reasoning off
  and `max_tokens` 4000 they took 2.7–7.6 s (four of five queried the points); on an intermediate deployment, 3.3–6.4 s, and all five queried them. Same model. On the final deployment (e4fef2ca, 14 Nov) eleven direct calls across all six presets: ten took 2.6–11.0 s (the two slowest, 7.3 and 11.0 s, were answers the checker sent back for a correction), and one took 26.0 s, past the page's 25 s limit, so the page would have shown the saved answer. Single runs, not a benchmark.
- **A script verifies those quotes.** `scripts/verify_insights.py` re-reads every named file (PDF text
  via `pdftotext`, DOCX via the stdlib XML reader), normalises whitespace only, and **exits non-zero if
  any quote is not literally present**. Changing one word of one quote makes it fail, so the claim is
  checkable by a judge in one command. A PDF is read both with `-layout` and without: `-layout` preserves
  the tables this corpus is mostly made of, but on a two-column report it interleaves the columns, so a
  quote passes if either faithful reading contains it.
- **No SI generated the data.** Every figure is computed by the build scripts from the NASA PSI tables;
  the prose around them is written by hand.
- **No generated images, audio or video** are used in the application or the deck. (`pitch/img/demo.gif` is a
  screen recording of the application, not generated media.)
- **What IGNIS delivers instead is a model-ready dataset.** The app exports the normalized corpus as
  CSV and JSON in the browser, with units, accession and row number on every field and a flag for
  where each pressure value came from, plus one sentence stating the classes and O₂/pressure ranges
  the set actually supports — and therefore where a model trained on it would be extrapolating.

---

## References

- NASA Physical Science Informatics (PSI) — <https://psi.nasa.gov/> (data licence CC0-1.0).
- NASA International Space Apps Challenge 2026 — <https://www.spaceappschallenge.org/>
- Challenge: *Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data.*
- PSI accessions used: PSI-10 (ACME Flame Design), PSI-20 (BRE), PSI-21/22/23 (CLD Flame, E-FIELD,
  s-Flame), PSI-25 (BASS-II), PSI-26 (BASS), PSI-39 (CFI), PSI-47 (DAFT), PSI-68 (FLEX-2),
  PSI-69 (FLEX), PSI-98/99/100 (Saffire I/II/III), PSI-101 (SAME-R), PSI-102 (SAME), PSI-106 (SLICE),
  PSI-107 (SPICE), PSI-142 (Data Summary), PSI-159 (CFI-G).
- Python 3 standard library; no third-party runtime dependencies.

---

## Running it

```
open app/index.html          # the application — no server, no build step
```

Rebuild the data (requires the PSI source files under `data/psi_data/`):

```
python3 -I scripts/build_dataset.py     # -> app/data/dataset.js
python3 -I scripts/build_telemetry.py   # -> app/data/telemetry.js
python3 -I scripts/verify_insights.py   # checks every quote in insights.js and earth.js
node worker/test.mjs                    # the SI tool agrees with the dashboard; saved answers still pass
(cd worker && npx wrangler deploy)      # Ask IGNIS; set the key once: npx wrangler secret put OPENROUTER_API_KEY
node scripts/capture_ask_cache.mjs      # re-record the saved fallback answers from the deployed worker
```
