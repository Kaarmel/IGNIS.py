# IGNIS — 30-second film: context and script

This file is the brief for the project video. It replaces the talk deck as the main pitch format;
`pitch/index.html` and `pitch/TALK.md` stay as the backup for a live presentation. Anyone who edits the
film (a person or a tool) should be able to work from this file alone.

Every number below comes from `app/data/dataset.js` and is checked by `scripts/check_docs.py`
(timings and video specs are on its allow list). Do not add a number that is not here.

---

## 1. What the film has to do

**Audience:** the Space Apps judges. They watch many videos; they decide in the first five seconds.

**One message:** *NASA's open fire-safety data stops below the oxygen level of the planned Moon base.
IGNIS shows exactly where it stops, lets you search every test in seconds, and suggests which tests to
run next — and every claim opens the record it rests on.*

**What the judges must remember (three things, in this order):**

1. **The gap.** The challenge says the Moon Base and pressurized rovers will run at **30%** oxygen or
   more. Every solid-material test in NASA's open PSI archive stops at **22.7%**. That is a **7.3 pp**
   gap: **0** of **264** solid test points are at the challenge's oxygen level.
2. **The tool.** One page: a coverage map, a search over all **1,936** test points, and an SI that
   answers questions — each answer checked against the corpus before it is shown.
3. **The trust.** Click any source and you see the NASA file and row behind it. IGNIS suggests where to
   test next; the data is the evidence.

**Tone:** calm, factual, engineering. No hype words ("revolutionary", "game-changing"), no drama music
over the Apollo line.

---

## 2. Words we use and words we do not

| say | do not say | why |
|---|---|---|
| "not in NASA's open PSI archive" | "never tested", "NASA never tested this" | SoFIE-GEL burned PMMA on the ISS up to 34% O₂ (Combustion and Flame, 2025); its points are just not in PSI |
| "suggests where to test next" | "tells NASA what to do", "certifies", "safe / unsafe" | IGNIS is a research aid, not a safety authority |
| "checked against the corpus" | "AI-verified", "100% accurate" | the checks catch unbacked citations, quotes and numbers; the answer is still a summary |
| "SI" (on screen, as the challenge writes it) | — | the challenge text uses "SI" |
| "the challenge's 30%" | "NASA's requirement" | the challenge says oxygen "will likely be 30% or greater" — an expectation, not a requirement |

---

## 3. Storyboard (30 s, 16:9)

Voice-over: about 70 words. Captions burned in (many judges watch muted). Each caption is the key
number or phrase of its shot, not the full voice-over.

| time | picture | caption on screen | voice-over (EN) |
|---|---|---|---|
| 0–5 s | Black. White text appears line by line: "Moon base: 30% O₂". Then the IGNIS hero fades in. | **Moon base: 30% O₂** | "Apollo 1 burned in pure oxygen. The planned Moon base will run at thirty percent oxygen or more." |
| 5–12 s | Coverage map (`#map`). Slow zoom to the orange box and the red bracket between the two vertical lines. | **Solids tested in PSI: up to 22.7%** · **0 of 264 at 30%** | "We read NASA's open combustion archive. Every solid material tested there stops at twenty-two point seven percent." |
| 12–19 s | *Search data* tab: type "nomex", the table filters; click a row, the source popup opens (file name, row, values). | **1,936 test points · every row has its source** | "IGNIS puts all of it in one place: search any test, and open the NASA file and row behind it." |
| 19–26 s | *Ask SI* tab: click *Beyond the data*. The step list runs ("querying the PSI test points… checking every number and quote"), the answer appears, click "BASS · PSI-26 · row 55". | **Answers checked against the corpus** | "Ask it what the archive can't answer, and it says what's missing — and which test would close the gap." |
| 26–30 s | Test plan table (`#campaign`), then end card: IGNIS logo, URL, "NASA Space Apps 2026 · Flame in Freefall". | **IGNIS — where to test next** · kaarmel.github.io/IGNIS.py | "IGNIS. Where to test next." |

**Polish voice-over (if the film is made in Polish):**

| time | lektor (PL) |
|---|---|
| 0–5 s | „Apollo 1 spłonął w czystym tlenie. Planowana baza księżycowa będzie mieć trzydzieści procent tlenu lub więcej.” |
| 5–12 s | „Przeczytaliśmy otwarte archiwum spalania NASA. Każdy testowany tam materiał stały kończy się na dwudziestu dwóch i siedmiu dziesiątych procent.” |
| 12–19 s | „IGNIS zbiera to w jednym miejscu: znajdziesz każdy test i otworzysz plik oraz wiersz NASA, z którego pochodzi.” |
| 19–26 s | „Zapytaj o to, czego archiwum nie wie, a powie, czego brakuje — i jaki test zamknie lukę.” |
| 26–30 s | „IGNIS. Gdzie testować dalej.” |

---

## 4. How to record the screen

- **Page:** https://kaarmel.github.io/IGNIS.py/app/ (or `app/index.html` from the repo; the SI needs the
  network).
- **Browser:** Chrome, window 1920×1080, zoom 125%, bookmarks bar hidden, one tab, dark system theme.
- **Language:** EN for an English film, PL for a Polish one (the EN/PL switch is top right).
- **Recorder:** QuickTime (File → New Screen Recording) or OBS, 30 fps, no cursor highlight.
- **Take each shot separately**, 3–4 s longer than the storyboard, and cut in the edit.
- **SI shot:** the live answer takes a few seconds and the wording changes from run to run. Record two or
  three takes and keep the cleanest. Cut the wait down to about two seconds of the step list — the
  steps are the point, not the waiting. If the network fails, the page shows a saved answer labelled
  with its date; do not use that take.
- **Mouse:** move slowly and click where the caption points. Pause half a second before every click.
- **Fallback footage:** `pitch/img/demo.gif` is a recording of the SI shot (question, steps, answer,
  source popup).

## 5. Edit and delivery

- 30 s exactly, 1920×1080, H.264 MP4, captions burned in, loudness around −14 LUFS.
- Optional second cut 1080×1920 (vertical) for social media: same shots, cropped to the left column.
- Music: quiet, steady, no drop on the Apollo line.
- End card stays at least 3 s.
- Credits line (small, last 3 s): "Data: NASA Physical Science Informatics (CC0). SI: DeepSeek V4.1 Flash
  via OpenRouter, answers checked against the corpus."

## 6. Facts and where each comes from

| fact | value | source |
|---|---|---|
| challenge oxygen for Moon Base and pressurized rovers | 30% or more, at 10.2 psi or less | challenge text, in `dataset.js` → `challenge` |
| highest oxygen any solid-material test in PSI reached | 22.7% (BASS, PSI-26, row 55) | `dataset.js` → `pillars.prevention` |
| gap | 7.3 pp | `dataset.js` → `challenge.gap_pp` |
| solid-material test points / at 30% O₂ | 264 / 0 | `dataset.js` → `testpoints` |
| test points in the search | 1,936 | `dataset.js` → `meta.testpoints` |
| SoFIE-GEL (outside PSI) | PMMA on the ISS, up to 34% O₂ | Combustion and Flame 277, 2025; `dataset.js` → `outside_psi` |

Apollo 1: the cabin fire in a pure-oxygen atmosphere during a ground test. It is history, not a corpus
figure, so the film names it without a year.
