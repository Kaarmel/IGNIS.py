# IGNIS — 30-second film: context and script

This file is the brief for the project video. It replaces the talk deck as the main pitch format;
`pitch/index.html` stays as the backup for a live presentation. Anyone who edits the
film (a person or a tool) should be able to work from this file alone.

**Published:** https://youtu.be/EfFLVnlmn70 (also on the project page, https://kaarmel.github.io/IGNIS.py/).

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

Voice-over: about 70 words, ~2.5 words/s. Captions burned in (many judges watch muted): a small kicker and
one headline in a band at the top, so the bottom stays free for full subtitles in the Polish-voice cut.
Shots cross-fade (0.3 s). The arc follows the Space Apps suggestion: hook → challenge → name → how it
works → what comes next.

| time | picture | caption on screen | voice-over (EN) |
|---|---|---|---|
| 0–5.2 s | Black. "Apollo 1 burned in pure oxygen." Then "Moon base: 30% O₂ or more." | (the card is the caption) | "Apollo 1 burned in pure oxygen. The Moon base: thirty percent or more." |
| 5.2–13.5 s | **Dot strip, built from the data:** an oxygen axis 10–40%; every solid-material test in PSI drops in as a dot at its O₂. A line at 22.7% (BASS, PSI-26 row 55). The challenge zone at 30%+ lights up, with one line from the deck's slide 2: same O₂ partial pressure as sea-level air, but NASA certifies materials at 30% O₂, 10.2 psia. A red bracket: 7.3 pp, 0 of 264. | THE GAP · **NASA's open fire data stops at 22.7% O₂** | "We plotted every solid-material fire test in NASA's open PSI archive. They stop at twenty-two point seven. At thirty: none." |
| 13.5–16.5 s | The IGNIS page opens (hero, slow push). | IGNIS · **SI-powered fire-safety dashboard on NASA's open data** | "IGNIS turns that archive into one tool:" |
| 16.5–21 s | *Search data*: type "nomex", the table filters; click a row; the source popup opens with its file and row highlighted. | SEARCH · **1,936 test points · every row opens its NASA file** | "search every test point, and open the NASA file and row behind it." |
| 21–27.2 s | *Ask SI* → *Beyond the data*. ~1.5 s of the step list ("checking every number and quote"), the answer appears; its first line and the test it suggests are highlighted. | ASK THE SI · **Answers checked against the corpus** | "Ask what the data can't answer: the SI says what's missing, and each answer is checked against the corpus." |
| 27.2–30 s | Test plan (`#campaign`) with the table highlighted; the last second is the end card as the closing frame: IGNIS, "Where to test next.", URL, "NASA Space Apps 2026 · Flame in Freefall", credits. | NEXT · **30 tests that would close the gap** | "It suggests thirty tests to close the gap." |

**Polish voice-over (if the film is made in Polish — use the `-subs` cut, it carries the English subtitles):**

| time | lektor (PL) |
|---|---|
| 0–5.2 s | „Apollo 1 spłonął w czystym tlenie. Baza na Księżycu: trzydzieści procent tlenu lub więcej.” |
| 5.2–13.5 s | „Każdy test spalania materiału stałego z otwartego archiwum PSI NASA. Kończą się na dwudziestu dwóch i siedmiu dziesiątych. Przy trzydziestu – ani jednego.” |
| 13.5–16.5 s | „IGNIS zamienia to archiwum w jedno narzędzie:” |
| 16.5–21 s | „przeszukasz każdy punkt testowy i otworzysz plik oraz wiersz NASA, z którego pochodzi.” |
| 21–27.2 s | „Zapytaj o to, czego dane nie mówią: SI powie, czego brakuje, a każdą odpowiedź sprawdza w korpusie.” |
| 27.2–30 s | „Podpowie trzydzieści testów, które zamkną lukę.” |

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
- The end card is the closing frame (about the last second), no fade-out.
- Credits line (small, on the end card): "Data: NASA Physical Science Informatics (CC0). SI: DeepSeek V4.1 Flash
  via OpenRouter, answers checked against the corpus."

## 5a. Scripted build (`film/make.ts`, kept local, not in the repository)

The picture is built by a script, not recorded by hand: `cd film && npm i && npx playwright install chromium && node make.ts` drives the live
page with Playwright, follows the storyboard above, burns the captions in and writes `film/out/ignis-film.mp4`
(key captions) and `film/out/ignis-film-subs.mp4` (plus full English subtitles, for a voice-over in Polish).
Re-run it after every deploy; the SI take is retaken if the answer has an unresolved citation.
Synthetic voice: `ELEVENLABS_API_KEY=… node make.ts --tts` reads the §3 lines with ElevenLabs (voice `nPczCjzI2devNBz1zQrb`), fits them to the shots and writes `film/out/ignis-film-voice.mp4` and `ignis-film-subs-voice.mp4`; it also lays a quiet AI-generated music bed (ElevenLabs sound generation) 14 LU under the voice, ducked while it speaks (`--no-music` skips it); the file metadata says the voice and the music are AI-generated. Own voice: `node make.ts --voice vo.wav` (add `--subs` for the subtitled cut) mixes it in at −14 LUFS and
checks the result is still 30 s. A synthetic (TTS) voice must be declared in the project description.

## 6. Facts and where each comes from

| fact | value | source |
|---|---|---|
| challenge oxygen for Moon Base and pressurized rovers | 30% or more, at 10.2 psi or less | challenge text, in `dataset.js` → `challenge` |
| highest oxygen any solid-material test in PSI reached | 22.7% (BASS, PSI-26, row 55) | `dataset.js` → `pillars.prevention` |
| gap | 7.3 pp | `dataset.js` → `challenge.gap_pp` |
| solid-material test points / at 30% O₂ | 264 / 0 | `dataset.js` → `testpoints` |
| test points in the search | 1,936 | `dataset.js` → `meta.testpoints` |
| suggested test plan | 30 tests: 5 material classes × 3 O₂ levels × 2 pressures, 1 test each | `dataset.js` → `campaign` |
| SoFIE-GEL (outside PSI) | PMMA on the ISS, up to 34% O₂ | Combustion and Flame 277, 2025; `dataset.js` → `outside_psi` |

Apollo 1: the cabin fire in a pure-oxygen atmosphere during a ground test. It is history, not a corpus
figure, so the film names it without a year.
