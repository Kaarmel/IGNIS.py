"""Re-derive the 30-test plan from the test points and check every figure.

python3 scripts/verify_test_plan.py — reads app/data/dataset.js only, recomputes
each factor of the plan (materials, oxygen levels, pressures, replicates) and
the arithmetic in docs/TEST-PLAN-MATH.md from the test points and the stated
atmospheres, and exits 1 if anything differs from what the build stored.
This is a second, independent computation: it shares no code with
scripts/build_dataset.py. Standard library only.
"""
import json
import os
import sys
from fractions import Fraction

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
src = open(os.path.join(ROOT, "app/data/dataset.js"), encoding="utf-8").read()
D = json.loads(src[src.index("{"):src.rindex("}") + 1])
C, W = D["campaign"], D["campaign"]["why"]
TP = D["testpoints"]
fails = []


def check(label, got, want):
    ok = got == want
    print(f"  {'ok ' if ok else 'BAD'} {label}: {got}" + ("" if ok else f"   (stored: {want})"))
    if not ok:
        fails.append(label)


# The same five material classes and keywords the plan names.
CLASSES = [("SIBAL fabric", ("sibal", "cotton-fiberglass")), ("PMMA", ("pmma", "sphere", "rod", "film")),
           ("Nomex", ("nomex",)), ("Ultem", ("ultem",)), ("Silicone", ("silicone",))]


def cls(m):
    m = (m or "").lower()
    return next((n for n, keys in CLASSES if any(k in m for k in keys)), None)


solid = [r for r in TP if r["ph"] == "solid" and r["o2"] is not None]
ceil = max(r["o2"] for r in solid)
ceil_pct = round(ceil * 100, 1)

print("1. Materials: the classes already burned within 1 point of the solid ceiling")
near = [r for r in solid if r["o2"] >= ceil - 0.01]
by = {}
for r in near:
    c = cls(r["m"])
    if c:
        by[c] = by.get(c, 0) + 1
check("ceiling, % O2", ceil_pct, D["pillars"]["prevention"]["solid_ceiling_pct"])
check("window starts at, % O2", round(ceil_pct - 1, 1), W["near_ceiling_from_pct"])
check("tests in the window", len(near), W["near_ceiling_tests"])
check("tests per class", dict(sorted(by.items())), dict(sorted((k, v["tests"]) for k, v in W["near_ceiling_by_class"].items())))
check("classes in the plan", sorted(by), sorted(C["classes"]))
left = sum(1 for r in near if not cls(r["m"]))
check("left out (model fuels, unnamed samples)", left, sum(W["near_ceiling_left_out"].values()))
sil = [r for r in TP if r["ph"] == "solid" and cls(r["m"]) == "Silicone"]
check("silicone tests with a recorded pressure", sum(1 for r in sil if r["p"] is not None), W["silicone"]["with_pressure"])

print("2. Oxygen levels: the three the sources name, and what they do to the gap")
L, A, CH = D["lunar"], D["lunar"]["alternate"], D["challenge"]
levels = [round(L["target_o2_frac"] * 100, 1), round(CH["o2_frac"] * 100, 1), round(A["o2_frac"] * 100, 1)]
check("levels, % O2", levels, C["o2_levels_pct"])
steps = [round(b - a, 1) for a, b in zip([ceil_pct] + levels, levels)]
check("steps from the ceiling up, points", steps, W["o2_steps_pp"])
check("largest distance to a tested level after the plan, points", round(max(steps) / 2, 1), W["max_o2_distance_after_pp"])
check("distance from the challenge level today, points", round(levels[1] - ceil_pct, 1), CH["gap_pp"])
check("distance from the highest level today, points", round(levels[2] - ceil_pct, 1), L["gap_capability_pp"])

print("3. Pressures: the two the Artemis paper names")
press = [L["target_pressure_bar"], A["pressure_bar"]]
check("pressures, bar", press, C["pressures_bar"])

print("4. Oxygen partial pressure of each cell, and solid tests already at it (within the stated tolerance)")
both = [r for r in solid if r["p"] is not None]
tol = CH["tolerance"]
cells = []
for o in levels:
    for p in press:
        v = o / 100 * p
        cells.append({"o2_pct": o, "p_bar": p, "ppo2_bar": round(v, 3),
                      "solid_tests_same_ppo2": sum(1 for r in both if abs(r["o2"] * r["p"] - v) <= tol * v)})
for c, s in zip(cells, W["cells_ppo2"]):
    check(f"{c['o2_pct']}% at {c['p_bar']} bar", (c["ppo2_bar"], c["solid_tests_same_ppo2"]), (s["ppo2_bar"], s["solid_tests_same_ppo2"]))
check("sea-level air, bar O2", round(0.21 * 1.01325, 3), W["air_ppo2_bar"])
a, b = (levels[0], press[0]), (levels[2], press[1])
pa, pb = a[0] / 100 * a[1], b[0] / 100 * b[1]
check("Artemis nominal vs capability: partial-pressure difference, %", round(abs(pa - pb) / max(pa, pb) * 100, 1), W["matched_pair"]["ppo2_difference_pct"])
check("... while the oxygen share differs by, points", round(b[0] - a[0], 1), W["matched_pair"]["o2_difference_pp"])


print("5. Is every effect identifiable? Exact rank of the design matrix")


def rank(rows):
    m = [[Fraction(x) for x in row] for row in rows]
    r = 0
    for c in range(len(m[0])):
        piv = next((i for i in range(r, len(m)) if m[i][c] != 0), None)
        if piv is None:
            continue
        m[r], m[piv] = m[piv], m[r]
        for i in range(len(m)):
            if i != r and m[i][c] != 0:
                f = m[i][c] / m[r][c]
                m[i] = [x - f * y for x, y in zip(m[i], m[r])]
        r += 1
    return r


terms = lambda o, p: [1, o, o * o, p, o * p, o * o * p]
full = [terms(o, p) for o in levels for p in press]
check("terms per material", len(full[0]), W["model_terms"])
check("rank, 3 levels x 2 pressures", rank(full), W["rank_full_design"])
check("rank, 2 levels x 2 pressures", rank([terms(o, p) for o in (levels[0], levels[2]) for p in press]), W["rank_two_o2_levels"])
check("rank, the two Artemis atmospheres alone", rank([terms(*a), terms(*b)]), W["rank_two_artemis_points"])
n = len(C["classes"])
pooled = [terms(o, p) + [1 if k == j else 0 for k in range(1, n)] for j in range(n) for o in levels for p in press]
check("rank, five materials sharing one shape", rank(pooled), W["rank_pooled"])
check("degrees of freedom left for scatter", len(pooled) - rank(pooled), W["pooled_residual_df"])

print("6. Replicates and the total")
reps = {}
for r in solid:
    if r["i"] in ("PSI-25", "PSI-26"):
        k = (r["i"], r["m"], round(r["o2"], 3))
        reps[k] = reps.get(k, 0) + 1
rv = sorted(reps.values())
check("BASS conditions", len(rv), C["conditions_in_bass"])
check("median tests per condition", rv[len(rv) // 2], C["replicates"])
check("conditions with exactly that many", sum(1 for v in rv if v == rv[len(rv) // 2]), C["conditions_with_that_many"])
check("tests = materials x levels x pressures x replicates", n * len(levels) * len(press) * rv[len(rv) // 2], C["tests"])

if fails:
    print(f"{len(fails)} figure(s) differ: {', '.join(fails)}")
    sys.exit(1)
print("test plan: every figure re-derived from the test points")
