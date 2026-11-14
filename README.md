# IGNIS — the oxygen ceiling

**NASA International Space Apps Challenge 2026 · "Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data"**
Local event: Rzeszów, 14–15 November 2026.

IGNIS is an SI-powered, web-based fire-safety dashboard over NASA's microgravity combustion archive. It
summarizes, ranks and interprets the investigations, and it answers the challenge's three goals with three
views: which investigations bear on fire safety in a crewed cabin, a lunar base or a pressurised rover
(the Atlas); what data exists to support predictive modelling (the coverage map and the O₂ × flow map);
and what would inform the next generation of fire-safety controls (the three-pillar card).

| the challenge asks | where IGNIS answers it |
|---|---|
| an SI-powered web tool that summarises, ranks and interprets investigations | Ask IGNIS (live, cited, quote-checked) and the Atlas mission ranking |
| investigations relevant to crewed cabins, lunar bases and pressurised rovers | Atlas and the destination solver |
| data that supports predictive modelling | coverage map, O₂ × flow map and the model-ready export under the pillar cards (each field with accession, row and units); source: `app/data/dataset.js` |
| what informs next-generation fire-safety controls | the four cards at the top and the three-pillar card |
| what is missing | verdict, test campaign matrix and the printable evidence gap report |

## What a habitat designer should do differently

The page opens with these four cards, each with one number, one conclusion, one limit and a link to the
accession it rests on:

- **Suppression — test cutting the air flow first.** The BASS operators recorded **18** attempts to put a burning solid
  out with nitrogen; **16** left the flame lit, and in **10** of those the flame went out when the air flow
  was turned off. *Limit:* operator log entries at 17.5–22.6 % O₂ and cabin pressure, small glovebox samples — a
  signal to test at cabin scale, not a procedure. Operations teams already know air flow matters; the point is
  where the open data shows it.
- **Design atmosphere — do not count on self-extinction.** **0 of 17** FLEX droplets near the 10.2 psi design
  pressure at 30–34 % O₂ self-extinguished, against **14 of 29** in the same nitrogen series at cabin air.
  *Limit:* droplets, not cabin materials, and both axes differ between the cohorts — an analogue.
- **Detection — finer smoke, slower detection.** The SAME final report: "a substantial portion of the smoke
  particles are below 500 nm in diameter" and "detection times are longer than in normal gravity".
  *Limit:* the SAME tables record no oxygen or pressure.
- **The gap — why a–c are analogues.** Every solid-material test stops at **22.7 %** O₂ (a BASS row), 7.3
  points below the challenge's 30 %.

The reference point is the challenge's own sentence: lunar oxygen **"will likely be 30 % or greater, with a
corresponding pressure of 10.2 psi or less"**, with suits **"filled with 100 % oxygen to only 4.3 psi"**.
NASA's reference design for a lunar surface habitat — 10.2 psia (0.703 bar) at 26.5 % oxygen, capability
8.2 psia at 34 % (Kessler et al., NTRS 20220000245) — is the second marker. The challenge gives that one
atmosphere to the Moon Base and the pressurised rovers alike, and none for Mars; Kessler gives none for the Mars
transit habitat either, so the solver offers that entry as
"atmosphere not given — enter your own" rather than a guessed preset.

Every solid-material test in the NASA PSI corpus — 264 points across five investigations — stops at **22.7 %**,
and every one of them that records a pressure ran at **one atmosphere**. Against the challenge's 30 % that is
a **7.3 pp** gap; against the Artemis nominal, **3.8 pp**, and **11.3 pp** to the 34 % capability.
IGNIS maps the columns of 18 of the 22 published test tables (16 accessions yield test points), counts the
rows of the other four by name — three ACME tables, CLD Flame, E-FIELD and s-Flame (82 rows), whose columns
this build does not map, and the cross-experiment summary sheet — measures the gap, and states, per
destination and per material class, what the evidence does and does not support. PSI-115 and PSI-117 have no
test table. When the answer is a gap, it names the experiment that would close it: the oxygen band PSI has no test for,
the pressure to run at, and how far the nearest real measurement sits. That answer prints as a one-page
evidence gap report.

## The finding

| funnel step | test points |
|---|---|
| rows in the 22 experimental tables (20 accessions) | 2,870 |
| rows that parse into a test point | 1,936 |
| solid-material test points | 264 |
| solid points that record an oxygen level | 261 |
| **solid points above the challenge's 30 % O₂** | **0** |
| **solid points above the habitat's nominal level (26.5 % O₂)** | **0** |

- Solid-material oxygen ceiling: **22.7 %** — the highest of the 261 solid points that record a level. Against the
  challenge's 30 % that is **7.3 pp with no solid test in PSI**; against the Artemis nominal, **3.8 pp** — and
  **11.3 pp** to the 34 % capability mode, where PSI has no solid test within 0.03 bar of 0.565 bar either.
- **This is a gap in the open archive, not in all of science.** Outside PSI, SoFIE-GEL on the ISS burned 4 cm
  PMMA spheres at 13–34 % O₂ and 0.15–1.1 atm (James et al., *Combustion and Flame* 277, 114244, 2025). Its
  points are not in PSI, so a dashboard built on the open archive cannot use them; the first step of closing
  the gap is to publish them there.
- The only materials-flammability study in PSI above cabin air is **BRE**, the Burning Rate Emulator: a
  gas burner that emulates a burning surface, **194 flames over 18 test days**, **21–40 % O₂**, 25 and 50 mm
  burners, ethylene and methane. It is its own class in the app — a material-flammability emulator, not a
  solid sample — and it records **no pressure**: the table's own note says the chamber pressures "were also
  varied but are not identified in this summary table".
- The pressure axis is not empty, and that makes the gap worse rather than better: **252 of the 264** solid points
  have a chamber pressure recorded somewhere in the corpus — 121 in the test table (BASS publishes it in its
  as-run matrix, a workbook filed under Science Documents rather than in the experimental table), 129 documented
  as cabin pressure — about 1 atm — in the BASS-II summary report, 2 in the Saffire-I sensor workbook
  (14.85–14.90 psia) — and all 252 sit between **0.9829 and 1.0275 bar**. The BASS-II number is the report's
  statement of the cabin pressure for the campaign, not a per-test reading: the table publishes no pressure
  column, which is exactly the point. Twelve have no pressure anywhere. In this corpus no solid material has
  been burned at 0.703 bar, and none above 22.7 % O₂. The ceiling itself is a method artifact: BASS-II ran inside the
  Microgravity Science Glovebox at one atmosphere and varied oxygen by diluting ISS air with nitrogen, which can
  only go down; the highest solid point itself is a BASS row (PSI-26, row 55).
- Pressure is not the gap *at the design point*: 103 FLEX droplet tests ran within 0.03 bar of it — but only **17**
  of them also reached 26.5 % O₂ (range 30–34 %). The droplet analogue exists; material flammability at the
  lunar atmosphere does not. What those 17 did: **none of them self-extinguished**, against
  **14 of 29** in the same nitrogen-diluted FLEX series held at cabin air (21 % O₂ ±0.5). Both axes differ between
  the cohorts, so this is an analogue, not a controlled comparison.
- **The BASS operators' notes say the same thing for solids.** Of the **121** BASS tests that carry an
  operator note, **25** mention nitrogen: **5** used it to lower the oxygen level, and **18** record an attempt
  to put a burning sample out with it. **16** record the flame staying lit, **2** record it going out (one is
  `"flame did blow out with GN2 at about a pot 6."`). In **10** of the 16 the note records the flame going out
  when the air flow was turned off, in **2** more when the fan was turned down. Each note was read one by one
  rather than pattern-matched; the reading and the words it rests on are in `N2_READ` in
  `scripts/build_dataset.py`, and the build fails if those words are not in the note. These are operator log
  entries at **17.5–22.6 %** O₂, not a controlled comparison — but together with the droplets they point one
  way: what decided the outcome was the oxygen reaching the flame, not which inert gas was used.
- Unique asset: 370 documented flame-extinction events, 40 test series reconstructed from raw 125 Hz telemetry.

The arithmetic closes: **2,870** published rows, **959** rejected for a named cause, **1,911** rows that
become test points — and **1,936** test points, because BRE's 18 test-day rows each list several oxygen
levels and become 43 points. The 959: 861 empty rows at the tail of the CFI-G inverse-flame sheet, 82 in
three ACME tables whose columns this build does not map, 8 in the cross-experiment summary sheet, and 8
Saffire rows (4 of them pre-test flow-visualisation records). The 2 BRE cells whose separator was lost on
export (`3400%`, `2100%`) keep their raw text and become one point with no level instead of a fabricated
34 % and 21 %.

## Run it

No build step, no server, no dependencies:

```
open app/index.html
```

Everything runs from the file except live SI (the *Ask IGNIS* panel and the Atlas mission ranking), which
calls the deployed worker (`worker/`, endpoint in the `ignis-ask` meta tag of `app/index.html`). Without the
network those show saved answers, labelled with the date they were recorded.

## Rebuild the data

The PSI source files are 5.4 GB and are **not in this repo** (see `.gitignore`). Fetch them with
the accessions listed in `data/index.json` from the PSI API, drop the files under `data/psi_data/`, then
(`scripts/build_index.py` regenerates that index from a local copy — it does not download):

```
python3 -I scripts/build_dataset.py     # -> app/data/dataset.js
python3 -I scripts/build_telemetry.py   # -> app/data/telemetry.js
python3 -I scripts/verify_insights.py   # checks every quote in insights.js and earth.js
node worker/test.mjs                    # the SI tool agrees with the dashboard; saved answers still pass
(cd worker && npx wrangler deploy)      # Ask IGNIS; set the key once: npx wrangler secret put OPENROUTER_API_KEY
node scripts/capture_ask_cache.mjs      # re-record the saved fallback answers from the deployed worker
```

Every table is mapped explicitly in `SPEC` (`scripts/build_dataset.py`). A generic parser silently
mis-units here: three pressure units (atm, bar, mmHg), two oxygen conventions (fraction vs percent),
free-text values like `"1 atm"`, `~ 22.1` approximations, a typo'd `Samle Thickness` header,
whitespace-padded headers, and a literal `0` used as a missing-value sentinel. One join is not in a CSV
at all: BASS's oxygen and chamber pressure live in `PSI-26_Science Documents_As Run_Test Matrix.xlsx`,
which `read_xlsx_sheet` parses with `zipfile` and `ElementTree` — no third-party dependency.

## Data

NASA Physical Science Informatics (PSI), **CC0-1.0**. 22 accessions in this challenge area, 7,463 source files, 5.4 GB.
Twenty of them publish an experimental test table — 22 tables in all. 18 tables are column-mapped here; the three ACME
tables CLD Flame, E-FIELD and s-Flame (82 rows) and the summary sheet are counted but not mapped. PSI-115 and PSI-117
carry only reports, presentations and analyzed-data files, so they contribute no test points.
No NASA logo or branding is used; PSI is credited as the source throughout.

## SI disclosure

Super-intelligent (SI) tools were used in this project, as required by the 2026 challenge rules:

- **Claude (Anthropic)** — code for the normalization and telemetry-join scripts, the web application,
  and this document; exploratory analysis of the PSI tables; drafting of the narrative.
- **SI read the PSI documents and extracted the per-investigation summaries.** The Atlas shows, for each
  accession, an objective, fuel, sample, what changed between tests, sensors, apparatus and one
  fire-safety conclusion: **84 sentences lifted verbatim from the PSI reports and presentations**, plus 23 from NASA's 2015 guide (below), stored
  in `app/data/insights.js` with the name of the file each one came from. Each of the twelve accessions
  that publish a document also carries one **SI summary** sentence — what the study means to someone
  designing the habitat — printed above the quotes it is written from. Eight of the twenty accessions
  publish only a table; six of those are now described from NASA's 2015 guide (below).
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
- **A script verifies every quote.** `scripts/verify_insights.py` re-reads each named file (PDF via
  `pdftotext`, DOCX via the stdlib XML reader), normalises whitespace and nothing else, and **exits
  non-zero if any quote is not literally there**. Change one word of one quote and it fails. A PDF is
  read both with `-layout` and without, because `-layout` preserves the tables but splits a two-column
  report down the middle; a quote passes if either faithful reading contains it.
- No SI was used to generate the data. Every number in the application is computed from the PSI source
  tables by `scripts/build_dataset.py` and `scripts/build_telemetry.py`. Prose in the
  application (headings, verdict wording) is written by hand; every number is not. All analytical claims
  were checked against the raw rows.
- No generated images, audio, or video are used in the application.

## License

Code: MIT. Data: CC0-1.0 (NASA PSI).
