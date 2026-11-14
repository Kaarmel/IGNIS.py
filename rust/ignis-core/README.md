# ignis-core

Unit-safe normalization and coverage verdicts for NASA PSI microgravity
combustion data. No dependencies, `#![forbid(unsafe_code)]`.

This is the reusable core of [IGNIS](https://github.com/Kaarmel/IGNIS.py),
extracted from the build so the parts that are easy to get wrong can be reused
and tested on their own. It is not a port of the app — the table-specific
mapping (which accession uses which column names) stays in the Python build
scripts, because that mapping is data, not logic, and porting it would be a
maintenance liability.

## What it solves

The PSI tables are not comparable as published. In the same corpus you get:

| Hazard | Example | What the crate does |
| --- | --- | --- |
| Three pressure units | `atm`, `bar`, `mmHg`, free text `"1 atm"` | `to_bar` normalizes to bar, declines on ambiguity |
| Two oxygen conventions | `0.265` and `26.5` in different accessions | `to_fraction` returns a mole fraction either way |
| Missing-value sentinels | `***`, `n/a`, and a literal `0` | returns `None`; `0` is "not recorded", not vacuum |
| Planned test matrices | `"21; 26.5; 40"` | returns `None` — a list of conditions is not a reading |
| Approximation prefixes | `~ 22.1`, `≈22.1`, `<0.5` | reads the number; an approximation is still evidence |
| Decimal commas | `26,5` | accepted |

Every fallible function returns `Option`. Nothing is silently coerced to a
default, because a parser that guesses is worse than one that declines.

## Coverage

`coverage(pool, p, o2)` answers: how much does this material class actually
support a queried atmosphere?

- **tolerance** — ±15 % pressure (compared in log space, so it is symmetric)
  and ±1.5 percentage points oxygen (compared in integer ten-thousandths,
  because `0.265 - 0.25` is `0.015000000000000013` in binary and a float
  comparison would put points sitting exactly on the edge outside it)
- **bracket** — the query must sit inside a real two-sided box of
  measurements. One quadrant is not a bracket; 121 tests above a 5 % oxygen
  query does not mean 5 % was measured
- **verdict** — `Covered` needs both ≥5 points in tolerance *and* a bracket.
  Five tests just under the ceiling is not coverage of a point above it

```rust
use ignis_core::{coverage, o2_envelope, TestPoint, Verdict};

// The solid class in the PSI corpus never ran above 22.72 % oxygen.
let solid = vec![
    TestPoint { o2: 0.209, p: 1.013 },
    TestPoint { o2: 0.227, p: 0.983 },
];
assert_eq!(coverage(&solid, 0.703, 0.265).verdict, Verdict::Blind);
assert_eq!(o2_envelope(&[0.136, 0.209, 0.2272]), Some((0.136, 0.2272)));
```

`o2_envelope` takes every oxygen reading in a class, **including rows with no
pressure**. That asymmetry is deliberate: a row saying "this class ran at 34 %
oxygen" is evidence about the ceiling even when the pressure cell is blank, so
deriving the envelope from the solver pool would understate it.

## Tests

```console
cargo test --offline
```

- 13 unit tests covering each hazard above and each verdict branch
- `tests/corpus.rs` — a differential test against the shipped application over
  the real 1,895-row corpus (`tests/fixtures/testpoints.csv`). The expected
  verdicts were captured by driving the app in headless Chromium, not by
  running this crate, so a disagreement between the two implementations fails
  the build instead of being assumed away.

The fixture is CC0-1.0, derived from NASA's Physical Science Informatics
corpus.

## Out of scope

Deliberately not here: CSV/XLSX parsing, the accession-to-column mapping, and
the report rendering. Those live in the Python build (`scripts/`) and the
browser app (`app/`). This crate is the part where a wrong answer is invisible
and a right one is testable.
