# Why these 30 tests, and why these points

The test plan in IGNIS is computed, not chosen. This file gives the arithmetic behind each factor.
Every number here is stored by `scripts/build_dataset.py` in `app/data/dataset.js` (`campaign` and
`campaign.why`). `python3 scripts/verify_test_plan.py` derives each one again from the test points in a
separate computation and fails if any differs. It runs as part of `sh scripts/check_all.sh`.

**The plan in one line:** 30 tests = 5 materials × 3 oxygen levels × 2 pressures × 1 test per condition.
Step 0 comes first: publish the SoFIE-GEL points in PSI.

---

## 1. Which materials: the ones already burned closest to the ceiling

The highest oxygen share of any solid-material test in PSI is **22.7%** (BASS, PSI-26 row 55, SIBAL fabric).
The rule: take every solid test within 1 point of that ceiling, so at 21.7% oxygen or more.
That gives **68 tests**. Grouped by material class:

| class | tests at 21.7% or more | highest O₂ reached | investigations |
|---|---|---|---|
| PMMA | 42 | 22.6% | PSI-25, PSI-26, PSI-99 |
| SIBAL fabric | 9 | 22.7% | PSI-26, PSI-99 |
| Nomex | 4 | 22.5% | PSI-25, PSI-26 |
| Silicone | 3 | 22.1% | PSI-99 |
| Ultem | 2 | 22.5% | PSI-26 |

Left out: 8 tests. Candle (3) and paraffin wax (2, spelt two ways in the table) are model fuels, not cabin
materials. Two rows have no material name, and one (“200 micron 2 cm wide”) names a size but no material.
A test that cannot be named cannot be repeated.

**Why this rule:** every new test extends a series that already has a measured point for the same
material near the ceiling. The step from the old point to the first new level is then a known 3.8 to 4.0 points
of oxygen in a known material (`campaign.cells`). A material never burned near 22.7% would first need its own baseline at lower
oxygen, and that is a different campaign.

**Silicone caveat:** all 4 silicone tests (Saffire-II) have no recorded pressure (0 of 4). Its six cells
have no pressure anchor, so for silicone the plan can say how far the oxygen jump is, but not the
pressure jump.

## 2. Which oxygen levels: 26.5%, 30% and 34%

Nothing is added here. 30% is the challenge's own figure (“30% or greater”). 26.5% and 34% are the Artemis
nominal and capability atmospheres in Kessler et al. (NTRS 20220000245). No source names a higher one.

**What they do to the gap.** Today every solid point is at 22.7% oxygen or less. An answer at 30% is
therefore an extrapolation 7.3 points beyond the data, and at 34% it is 11.3 points.
With the plan, the tested levels run from 22.7% (existing) to 26.5%, 30% and 34%, in steps of
**3.8, 3.5 and 4.0 points**. Any oxygen share between 22.7% and 34% is then at most **2.0 points** from a
tested level (half the largest step). The challenge level itself becomes a tested level, at distance 0.
Extrapolation turns into interpolation, and the steps are nearly even.

**Why three levels, not two:** a straight line always fits two points exactly. With two levels, a bend in
the response (for example, a share above which flames stop going out by themselves) cannot be seen.
Three levels is the fewest that can show it. Section 4 gives the matrix proof.

## 3. Which pressures: 0.703 and 0.565 bar

These are 10.2 psi, the challenge's ceiling and the Artemis nominal, and 8.2 psi, the Artemis capability.
The challenge says “10.2 psi or less”, so 8.2 psi lies inside its envelope, whose floor is the 4.3 psi
suit (0.2965 bar). The solid tests nearest to each cell were run at about 1 bar. Measured from the cell,
those tests sit 43 to 45% above it at 0.703 bar and 78 to 81% above it at 0.565 bar (`campaign.cells`).

**Why two pressures:** the two Artemis atmospheres change oxygen and pressure together. Tested on their own,
they cannot show which of the two caused a difference (rank 2 of 6, section 4). Running every oxygen level
at both pressures separates the effects.

## 4. The matrix argument: is every effect measurable?

For each material, take the smallest response surface that can show three things: a bend in oxygen,
a pressure effect, and a pressure effect that changes with oxygen:

    y = b0 + b1·x + b2·x² + b3·p + b4·x·p + b5·x²·p        (x = oxygen share, p = pressure)

That is 6 unknowns. Here *y* is whatever a test measures: spread rate, extinction flow, burn or no burn.
The argument depends only on where the tests are, not on what they measure. All six unknowns can be
estimated exactly when the design matrix (one row per test, one column per term) has rank 6.
Rank is computed exactly, with fractions and no rounding:

| design | tests per material | rank (of 6) | what it can measure |
|---|---|---|---|
| **3 levels × 2 pressures (the plan)** | 6 | **6** | every term |
| 2 levels × 2 pressures | 4 | 4 | not the bend, nor how pressure changes it |
| the two Artemis atmospheres alone | 2 | 2 | oxygen and pressure confounded |

So 3 × 2 = 6 is the smallest grid of the named atmospheres that measures every term. Remove one cell and
some effect can no longer be estimated.

## 5. Share against partial pressure: what each point adds

The partial pressure of oxygen in each cell is share × pressure. The table also counts the existing solid
tests already at that partial pressure, within the 5% tolerance the dataset uses for the challenge envelope:

| O₂ share | pressure, bar | O₂ partial pressure, bar | existing solid tests at that partial pressure |
|---|---|---|---|
| 26.5% | 0.703 | 0.186 | 26 |
| 26.5% | 0.565 | 0.150 | 14 |
| 30% | 0.703 | 0.211 | 118 |
| 30% | 0.565 | 0.169 | 64 |
| 34% | 0.703 | 0.239 | 11 |
| 34% | 0.565 | 0.192 | 22 |

The archive already covers every one of these partial pressures (sea-level air is 0.213 bar), but only at
shares of 22.7% or less and at about 1 bar. **The plan adds no new partial pressure. It adds new oxygen
shares at partial pressures the archive already has.** Every new result therefore has an existing test at
the same partial pressure to compare against. That comparison separates “the share drives flammability”
from “the partial pressure drives flammability”. It is the question of both NTRS papers in the
submission, and the reason NASA certifies materials at 30% and 10.2 psia.

The two Artemis atmospheres form a near-matched pair inside the plan: nominal (26.5%, 0.703 bar) gives
0.186 bar and capability (34%, 0.565 bar) gives 0.192 bar. **Their partial pressures differ by 3.0%, while
the share differs by 7.5 points.**

## 6. Replicates: 1 test per condition

BASS and BASS-II (PSI-25, PSI-26) hold 174 material-and-oxygen conditions. The median number of tests per
condition is 1, and 131 of the 174 conditions have exactly one. The plan follows the archive's own practice.

What that costs, stated plainly: with one test per cell, each material has 6 tests for 6 unknowns, so no
degrees of freedom are left to estimate scatter for a single material. If the five materials share one
shape and differ only by an offset (10 unknowns, rank 10 checked), the 30 tests leave **20 degrees of
freedom** to estimate scatter.

Air flow is not a factor of the 30. Each test uses the flow range BASS used for these classes,
0 to 49 cm/s (`campaign.flow_cm_s`).

## 7. What this does not show

- It predicts no outcome. It shows that the plan is the smallest grid of the named atmospheres that can
  measure each effect, and that it turns a 7.3-point extrapolation into interpolation.
- The surface in section 4 is a check on the design, not a fitted model. Above 22.7% there are no
  solid-material data to fit it to.
- Silicone has no recorded pressure in PSI (section 1).
- Step 0, publishing SoFIE-GEL in PSI, may move the ceiling. The rebuild then recomputes this plan and
  every number in this file.
