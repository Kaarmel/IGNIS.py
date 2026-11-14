#!/usr/bin/env python3
"""Normalize the 22 NASA PSI experimental tables into one dataset.

Run from repo root:  python3 -I scripts/build_dataset.py

Every table gets an explicit column map below. A generic auto-parser would
silently mis-unit (three pressure units, two O2 conventions, free-text
"1 atm", a typo'd "Samle Thickness"). Explicit beats clever here.
"""
import math
import csv, json, os, re, sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict

SRC = "data/psi_data"
OUT = "app/data/dataset.js"

ATM_BAR = 1.01325
PSI_BAR = 0.0689476
MMHG_BAR = 0.00133322

# accession -> acronym, human name, phase of matter, fire-safety pillars
INV = {
    "PSI-10":   ("Flame Design",  "ACME Flame Design",                         "gas",     ["prevention"]),
    # BRE is not a gas-flame experiment in the sense the other ACME tables are.
    # It is the only study in PSI that burned solid materials across an oxygen
    # range above cabin air, and it is a gas-burner emulation of a solid surface
    # burn. Its own class, so it neither inflates the solid-material count nor
    # disappears into the gas one.
    "PSI-20":   ("BRE",           "Burning Rate Emulator (ACME)",              "emulator", ["prevention"]),
    "PSI-21":   ("CLD Flame",     "Coflow Laminar Diffusion Flame (ACME)",     "gas",     ["prevention"]),
    "PSI-22":   ("E-FIELD",       "Electric-Field Effects on Flames (ACME)",   "gas",     ["prevention"]),
    "PSI-23":   ("s-Flame",       "Structure and Liftoff in Combustion (ACME)", "gas",    ["prevention"]),
    "PSI-25":   ("BASS-II",       "Burning and Suppression of Solids II",      "solid",   ["prevention", "suppression"]),
    "PSI-26":   ("BASS",          "Burning and Suppression of Solids",         "solid",   ["prevention", "suppression"]),
    "PSI-39":   ("CFI",           "Cool Flames Investigation",                 "droplet", ["prevention"]),
    "PSI-47":   ("DAFT",          "Dust and Aerosol Measurement Feasibility",  "dust",    ["detection"]),
    "PSI-68":   ("FLEX-2",        "Flame Extinguishment Experiment 2",         "droplet", ["suppression"]),
    "PSI-69":   ("FLEX",          "Flame Extinguishment Experiment",           "droplet", ["suppression"]),
    "PSI-98":   ("Saffire-I",     "Spacecraft Fire Safety Demo I",             "solid",   ["prevention", "suppression"]),
    "PSI-99":   ("Saffire-II",    "Spacecraft Fire Safety Demo II",            "solid",   ["prevention", "suppression"]),
    "PSI-100":  ("Saffire-III",   "Spacecraft Fire Safety Demo III",           "solid",   ["prevention", "suppression"]),
    "PSI-101":  ("SAME-R",        "Smoke and Aerosol Measurement, reflight",   "aerosol", ["detection"]),
    "PSI-102":  ("SAME",          "Smoke and Aerosol Measurement Experiment",  "aerosol", ["detection"]),
    "PSI-106":  ("SLICE",         "Structure and Liftoff in Combustion Exp.",  "gas",     ["prevention"]),
    "PSI-107":  ("SPICE",         "Smoke Point in Co-flow Experiment",         "gas",     ["prevention"]),
    "PSI-142":  ("Data Summary",  "Cross-experiment data summary",             "n/a",     []),
    "PSI-159":  ("CFI-G",         "Cool Flames Investigation with Gases",      "gas",     ["prevention"]),
}

# accession -> {table file suffix, o2 col, o2 unit, p col, p unit, flow col,
#               material col, fuel col, phase override}
SPEC = {
    "PSI-10":  [("Flame Design_Inverse Flame.csv", "XO2", "frac", "pmean (atm)", "atm", "mtot (mg/s)", None, None, "gas"),
                ("Flame Design_Normal Flame.csv",  "XO2 (init)", "frac", "pmean (atm)", "atm", "mtot (mg/s)", None, "Fuel", "gas")],
    "PSI-159": [("CFI-G_Inverse Flames.csv", "XO2", "frac", "approx p (bar)", "bar", None, None, "Fuel", "gas"),
                ("CFI-G_Normal Flames.csv",  "XO2 before test", "frac", "approx p (bar)", "bar", None, None, "Fuel", "gas")],
    "PSI-39":  [("CFI.csv", "Oxygen", "frac", "Pressure", "atm_text", None, "Fiber", None, "droplet")],
    "PSI-69":  [("FLEX.csv", "O initial ambient composition; mole fraction", "frac",
                 "Ambient pressure; mmHg", "mmHg", None, None, "Fuel", "droplet")],
    "PSI-68":  [("Flex2.csv", "Oxygen Mole Fraction", "frac", "Ambient Pressure (atm)", "atm",
                 "Flow Velocity (cm/s)", None, "Sample (Fuel Type)", "droplet")],
    "PSI-25":  [("BASS-II.csv", "Calibrated initial O2 % by vol", "pct", None, None, "Air display", "Fuel Sample Material", None, "solid")],
    "PSI-26":  [("BASS.csv", None, None, None, None, None, "Fuel Sample Material", None, "solid")],
    "PSI-98":  [("SAFFIRE-1.csv", "Percent O2", "pct", None, None, "Air Flow (cm/s)", "Material", None, "solid")],
    "PSI-99":  [("SAFFIRE-2.csv", "Percent O2 (Note 1)", "pct", None, None, "Air Flow (cm/s)", "Material", None, "solid")],
    "PSI-100": [("SAFFIRE-3.csv", None, None, None, None, "Air Flow", "Material", None, "solid")],
    "PSI-101": [("SAME-R.csv", None, None, None, None, "Inlet velocity (cm/s)", "Sample Type", None, "aerosol")],
    "PSI-102": [("SAME.csv", None, None, None, None, "Air Flow (cm/s)", "Sample Material", None, "aerosol")],
    "PSI-107": [("Spice.csv", None, None, None, None, "Air Rate (cm/s)", None, "Fuel", "gas")],
    "PSI-106": [("Slice.csv", None, None, None, None, None, None, "Fuel Type", "gas")],
    # BRE is read by its own parser below, not through this column map: its
    # oxygen cell is a list of levels per test day, and its outcome is a count
    # of flames, not a single value. Forcing it through one-column-per-field
    # would either invent a level or drop the row.
    "PSI-20":  [],
    "PSI-21":  [("CLD Flame.csv", None, None, None, None, None, None, None, "gas")],
    "PSI-22":  [("ACME E-FIELD Flames.csv", None, None, None, None, None, None, None, "gas")],
    "PSI-23":  [("ACME s-Flame.csv", None, None, None, None, None, None, None, "gas")],
    "PSI-47":  [("DAFT.csv", None, None, None, None, None, "Sample Material", None, "dust")],
    "PSI-142": [("Data Summary Table.csv", None, None, None, None, None, None, None, "n/a")],
}

# extra numeric outcome columns worth keeping, per accession
OUTCOMES = {
    "PSI-10":  ["Tad (K)", "mean Zst", "mtot (mg/s)", "mO2 (mg/s)", "pfinal (atm)"],
    "PSI-159": ["HC burnrate (mg/s)", "TFP", "Tad (K)", "Zst", "Hot ignition"],
    "PSI-69":  ["Burning rate; mm", "Burn time; s", "Droplet initial diameter; mm",
                "Visible flame extinction diameter; mm"],
    "PSI-98":  ["Ignition Power (W)", "Ignition Time (s)", "Burn Time (s)"],
    "PSI-99":  ["Ignition Power (W)", "Ignition Time (s)", "Burn Time (s)", "?-g Burn Length"],
    "PSI-101": ["Rt/R0", "Duration (sec)"],
    "PSI-107": ["Fuel Rate (mg/s)", "Fuel Rate (sccm)"],
    "PSI-102": ["Weight loss rate (mg/min)"],
}

# Text outcome columns: what happened to the sample, not just where it ran.
# A coverage audit throws this away, and with it the only answer the corpus can
# give about the design point.
OUTCOME_COL = {
    "PSI-69":  "Test end",                  # Extinction / Disruption / Completion
    "PSI-159": "Self-ext or flow term",     # SE / FT
}
OUTCOME_MAP = {"SE": "Extinction", "FT": "Flow terminated"}

# FLEX varies the diluent (N2, CO2, He). Comparing oxygen levels across
# different diluents compares two things at once, so the design-point cohort
# below is the nitrogen series only.
DILUENT = {"PSI-69": ("CO initial ambient composition; mole fraction",
                      "He initial ambient composition; mole fraction")}

# Three solid investigations publish no pressure column in their test table, but
# the corpus still records the pressure somewhere else. Naming that source is the
# difference between "not recorded" and "not in the column we happened to parse".
# Every one of them is cabin pressure: the pressure axis was never varied, only
# the oxygen was, and only downward.
# What each entry supplies is a CABIN PRESSURE FOR THE ACCESSION, not a measured
# value for each row. BASS-II's report says the pressure "varied from 99.2 to
# 99.5 kPa in the tests reported" in one section and "Ambient pressure was 1 atm"
# in another; it does not publish a pressure per test. So the number stored on
# the row is the mid-point of the documented range, flagged with "pd" so the app
# can say where it came from. Quoting 99.2-99.5 kPa as if it described all 129
# tests would be a claim the report does not make.
PRESSURE_DOC = {
    "PSI-25": (0.992, 0.995, "BASS-II Summary Report: cabin pressure, "
                             "'total pressure ... varied from 99.2 to 99.5 kPa'"),
    "PSI-98": (1.0239, 1.0275, "Saffire-I raw sensor workbook, 'Ambient Pressure' "
                               "channel: 14.85-14.90 psia"),
}

def norm(s):
    return re.sub(r"\s+", " ", (s or "")).strip().lower()

# Saffire's tables carry "Pre-test flow visulation data for sample N" rows. They
# are flow-visualisation records taken before the burn, not material flammability
# tests, and counting them would inflate the solid-material class.
PRETEST = re.compile(r"pre-test|flow visul", re.I)

def num(v):
    if v is None:
        return None
    s = str(v).strip().replace(",", ".")
    if not s or s in {"***", "n/a", "na", "-"}:
        return None
    # "21; 26.5; 40" is a planned test matrix, not a measurement. Taking the
    # first number turns a list of four conditions into one oxygen level.
    if ";" in s:
        return None
    # "~ 22.1" and "≈22.1" are approximations, not missing values. Anchoring the
    # match at the first digit silently discarded eight Saffire oxygen readings.
    s = re.sub(r"^[~≈<>]\s*", "", s)
    m = re.match(r"^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?", s)
    if not m:
        return None
    try:
        return float(m.group(0))
    except ValueError:
        return None

def to_bar(v, unit):
    x = num(v)
    if x is None:
        return None
    if unit == "atm":
        r = x * ATM_BAR
    elif unit == "bar":
        r = x
    elif unit == "mmHg":
        r = x * MMHG_BAR
    elif unit == "psi":
        r = x * PSI_BAR
    elif unit == "atm_text":
        r = x * ATM_BAR if "atm" in str(v).lower() else None
    else:
        return None
    # FLEX row C11M201 records pressure as a literal 0 — a missing-value
    # sentinel, not vacuum. Nothing in PSI was run below 0.42 bar.
    if r is None or r < 0.05:
        return None
    return r

def to_frac(v, unit):
    x = num(v)
    if x is None:
        return None
    if unit == "pct":
        x /= 100.0
    if x > 1.5:          # a percent value that leaked past the unit label
        x /= 100.0
    if not (0 < x <= 1):
        return None
    return round(x, 4)

# ---- flow, and what happened while it changed ------------------------------
# 956 rows record an air-flow value, 135 of them solid-material rows, and until
# now the app showed none of it. In BASS-II the flow column is not a number but
# the operator's log of the air setting during the test: "5 down to ext",
# "10 blowoff", "5 3 2 ext". A trajectory, and in 18 of the 129 rows a recorded
# outcome. Reading only the first number throws away the outcome; ignoring the
# column throws away the axis the challenge names second after oxygen
# ("air flow is also important in microgravity").
def flow_record(cell):
    """Initial setting, final setting, outcome, from an operator-entered flow cell.

    "Air display" is flow speed in the duct in cm/s — the BASS-II ReadMe says so
    in as many words. Pot settings are a different field ("pot settings on the
    control box. 10 is max") and one row mixes the two: "5  pots 0.4  0.36
    0.32  0.31  0.30". Reading 0.30 off that as a velocity in cm/s would put a
    test at 30x the wrong flow, so when the cell mentions a pot the final
    setting is unknown rather than wrong.

    "5 down to ext" means the flow was reduced from 5 until the flame went out;
    the value at which it went out is not recorded. That is `to = None` with
    `ramp = True`, and the chart draws it as an arrow from the start rather than
    as a point at a setting nobody wrote down.
    """
    if cell is None:
        return None
    s = str(cell).strip()
    if not s:
        return None
    lo = s.lower()
    nums = re.findall(r"\d+(?:\.\d+)?", s)
    # "ext", "extinguished" and "0ext" (a separator lost on export) are all the
    # same record; "next" is not, hence the lookbehind rather than a substring
    # test. Word boundaries alone miss "0ext", which is one of the 15.
    outcome = ("blowoff" if "blow" in lo
               else "extinction" if re.search(r"(?<![a-z])ext", lo) else None)
    pot = "pot" in lo
    # A final setting is only a setting when the cell wrote a number after the
    # first one and that number is a duct velocity, not a potentiometer reading.
    to = float(nums[-1]) if len(nums) > 1 and not pot else None
    # "10 blowoff" blew off *at* 10 — that is a recorded setting, not a ramp.
    # Only a cell that says the flow came down ("down to ext", "decr") or that
    # lists intermediate settings with no final one is a ramp.
    ramp = bool(outcome) and to is None and ("down" in lo or "decr" in lo or pot)
    return {"v": float(nums[0]) if nums else None,
            "to": to,
            "ramp": ramp,
            "pot": pot,
            "out": outcome, "raw": s[:40]}


def read_xlsx_sheet(path, sheet_name):
    """Minimal .xlsx reader: zipfile + ElementTree, no third-party library.

    Parses a file this project downloaded itself from PSI, not untrusted input,
    which is why the stdlib parser is acceptable here and defusedxml is not
    worth a dependency the rest of the build does not otherwise need.
    """
    NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
    with zipfile.ZipFile(path) as z:
        shared = [(t.text or "") for t in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(NS + "t")] \
            if "xl/sharedStrings.xml" in z.namelist() else []
        rid = next((s.get(REL) for s in ET.fromstring(z.read("xl/workbook.xml")).iter(NS + "sheet")
                    if s.get("name") == sheet_name), None)
        target = next((r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
                       if r.get("Id") == rid), None)
        if not target:
            return []
        target = target.lstrip("/")
        sh = ET.fromstring(z.read(target if target.startswith("xl/") else "xl/" + target))
    rows = []
    for row in sh.iter(NS + "row"):
        vals = {}
        for c in row.findall(NS + "c"):
            v = c.find(NS + "v")
            if v is None or v.text is None:
                continue
            col = "".join(ch for ch in (c.get("r") or "") if ch.isalpha())
            vals[col] = shared[int(v.text)] if c.get("t") == "s" else v.text
        rows.append(vals)
    return rows


# BASS publishes oxygen and chamber pressure in its as-run test matrix — a
# workbook filed under Science Documents, not in the Experimental table CSV.
# The CSV carries only the test index. Without this join the largest
# solid-material campaign looks as though it recorded no pressure at all, which
# is exactly the claim this project used to make. It was wrong.
MATRIX_JOIN = {
    # accession: (workbook, sheet, key column, test-number column, oxygen column,
    #             pressure column, flow column, observation column)
    "PSI-26": ("PSI-26_Science Documents_As Run_Test Matrix.xlsx", "as run matrix",
               "C", "D", "AA", "AB", "K", "AD"),
}

MATRIX = {}
for _acc, (_fn, _sheet, _key, _tc, _o2c, _pc, _fc, _obc) in MATRIX_JOIN.items():
    _lut = {}
    for _row in read_xlsx_sheet(os.path.join(SRC, _acc, _fn), _sheet):
        _k = num(_row.get(_key))
        if _k is None:
            continue
        # The air setting is an operator log ("10, 5, 3"), and the observation
        # column is prose ("Blew off stagnation region but N2 did not extinguish
        # wake"). Both are kept: the first number is the initial setting, the
        # prose is where an extinction is recorded.
        _rec = (to_frac(_row.get(_o2c), "frac"), to_bar(_row.get(_pc), "atm"),
                flow_record(_row.get(_fc)), (_row.get(_obc) or "").strip())
        # "As run test no." is not unique: 24, 85, 89, 90 and 91 each appear
        # twice, and 89-91 are different tests a week apart (a PMMA strip and a
        # candle or sphere). Keying on the number alone gave both rows the later
        # test's oxygen, pressure and operator note. The test number disambiguates.
        _lut[(int(_k), norm(_row.get(_tc)))] = _rec
        _lut.setdefault(int(_k), []).append(_rec)
    MATRIX[_acc] = _lut


# ---- BRE: the only materials-flammability study above cabin air -------------
# One file, 18 rows, one row per TEST DAY. Its oxygen cell is a list of levels
# ("21; 26.5; 40") — the levels at which flames ignited that day — and its
# outcome is a count of flames, not a value. Run through the generic column map
# this produced two test points out of eighteen rows: two cells read "3400%" and
# "2100%" (a semicolon lost in the export), which the number parser turned into
# 34% and 21% without complaint. Both were artefacts of a parser that could not
# see the list. This parser keeps each row whole: date, burner, fuel, every
# level, and how many flames.
BRE_FILE = "PSI-20_Experimental table_ACME BRE.csv"
MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}

def o2_levels(cell):
    """Every plausible oxygen level in a list cell. An oxygen percentage above
    100 is a lost separator, not a level."""
    out = []
    for part in re.split(r"[;,/]", cell or ""):
        m = re.match(r"^(\d+(?:\.\d+)?)\s*%?$", part.strip())
        if not m:
            continue
        v = float(m.group(1))
        if 0 < v <= 100:
            out.append(round(v / 100, 4))
    return sorted(set(out))

def parse_bre(path):
    with open(path, encoding="utf-8-sig", errors="replace", newline="") as fh:
        days = []
        for r in csv.DictReader(fh):
            y, mo, d = num(r.get("Year")), MONTHS.get((r.get("Month") or "").strip()[:3].lower()), num(r.get("Date"))
            raw = (r.get("Oxygen Conc (percent)") or "").strip()
            days.append({
                "d": "%04d-%02d-%02d" % (int(y), mo, int(d)) if y and mo and d else None,
                "mm": num(r.get("Burner Size (mm)")),
                "fuel": (r.get("Fuel Bottle") or "").strip(),
                "lvl": o2_levels(raw),
                "fl": num(r.get("Flames Ignited")),
                "raw": raw,
                "note": (r.get("Notes") or "").strip()[:240],
            })
    return days

BRE_PATH = next((os.path.join(SRC, "PSI-20", f) for f in os.listdir(os.path.join(SRC, "PSI-20"))
                 if f.endswith(BRE_FILE)), None) if os.path.isdir(os.path.join(SRC, "PSI-20")) else None
BRE_DAYS = parse_bre(BRE_PATH) if BRE_PATH else []
bre_levels = sorted({x for d in BRE_DAYS for x in d["lvl"]})
bre = {
    "file": BRE_FILE,
    "days": BRE_DAYS,
    "n_days": len(BRE_DAYS),
    "flames": sum(int(d["fl"]) for d in BRE_DAYS if d["fl"] is not None),
    "levels": bre_levels,
    "o2_min": bre_levels[0] if bre_levels else None,
    "o2_max": bre_levels[-1] if bre_levels else None,
    "burners_mm": sorted({int(d["mm"]) for d in BRE_DAYS if d["mm"]}),
    "fuels": sorted({d["fuel"] for d in BRE_DAYS if d["fuel"]}),
    # The table has no pressure column, and its own note says why:
    "pressure": None,
    "pressure_note": next((d["note"] for d in BRE_DAYS if "pressure" in d["note"].lower()), None),
    # The emulator reaches the challenge's oxygen level but records no pressure,
    # so it cannot be counted inside an envelope defined on both axes. Said here
    # once, so the export note and the Atlas do not each invent a phrasing.
    "envelope_reach": "oxygen only — the table records no pressure",
}


rows_out = []
cohorts = defaultdict(list)
per_inv = {}
raw_rows = {}
warnings = []
pretest_rows = 0
blank_rows = 0

for acc in sorted(SPEC):
    acr, name, phase, pillars = INV[acc]
    got = 0
    for suffix, o2c, o2u, pc, pu, fc, matc, fuelc, ph in SPEC[acc]:
        path = None
        for fn in os.listdir(os.path.join(SRC, acc)):
            if fn.endswith(suffix) and "Experimental table" in fn:
                path = os.path.join(SRC, acc, fn)
                break
        if not path:
            warnings.append(f"{acc}: table {suffix} not found")
            continue
        with open(path, encoding="utf-8-sig", errors="replace", newline="") as fh:
            rd = csv.reader(fh)
            header = next(rd, [])
            idx = {norm(h): i for i, h in enumerate(header)}
            out_idx = [(c, idx[norm(c)]) for c in OUTCOMES.get(acc, []) if norm(c) in idx]
            for rn, r in enumerate(rd, 1):
                raw_rows[acc] = raw_rows.get(acc, 0) + 1
                if not any((c or "").strip() for c in r):
                    blank_rows += 1

                def cell(c):
                    i = idx.get(norm(c)) if c else None
                    return r[i] if i is not None and i < len(r) else None
                o2 = to_frac(cell(o2c), o2u) if o2c else None
                pb = to_bar(cell(pc), pu) if pc else None
                if acc in MATRIX:
                    k = num(cell("As Run Test #"))
                    hit = None
                    if k is not None:
                        hit = MATRIX[acc].get((int(k), norm(cell("Test #"))))
                        if hit is None:
                            # Fall back to the number only where it names one test.
                            _same = MATRIX[acc].get(int(k)) or []
                            hit = _same[0] if len(_same) == 1 else None
                    if hit:
                        o2 = hit[0] if hit[0] is not None else o2
                        pb = hit[1] if hit[1] is not None else pb
                        mflow, mfr, mobs = hit[2], hit[2], hit[3]
                    else:
                        mflow = mfr = mobs = None
                else:
                    mflow = mfr = mobs = None
                # A table with no pressure column is not the same as an
                # experiment with no pressure. Where the corpus documents it
                # elsewhere, use that value and mark the row so the app can say
                # which source it came from.
                pdoc = False
                if pb is None and acc in PRESSURE_DOC:
                    pb = (PRESSURE_DOC[acc][0] + PRESSURE_DOC[acc][1]) / 2
                    pdoc = True
                flow = num(cell(fc)) if fc else None
                fr = flow_record(cell(fc)) if fc else None
                # Flow and the operator's observation live in the same workbook
                # as the oxygen and pressure. BASS's CSV has neither column, so
                # without this join the largest solid campaign contributes no
                # flow and no recorded outcome at all.
                if mflow:
                    flow = mflow["v"] if flow is None else flow
                    fr = fr or mflow
                obs = mobs or ""
                mat = (cell(matc) or "").strip() if matc else ""
                fuel = (cell(fuelc) or "").strip() if fuelc else ""
                outc = (cell(OUTCOME_COL[acc]) or "").strip() if acc in OUTCOME_COL else ""
                outc = OUTCOME_MAP.get(outc, outc)[:16]
                if acc in DILUENT:
                    inert = all((num(cell(c)) or 0) == 0 for c in DILUENT[acc])
                else:
                    inert = None
                # Which diluent, per test. FLEX's four composition columns say
                # it and nothing else does; without this the suppression pillar
                # can only say "some inert gas", which is not the finding.
                dil = None
                if acc in DILUENT:
                    dil = ("He" if (num(cell(DILUENT[acc][1])) or 0) > 0
                           else "CO2" if (num(cell(DILUENT[acc][0])) or 0) > 0 else "N2")
                if outc and pb is not None and o2 is not None:
                    cohorts[acc].append((pb, o2, outc, inert, dil))
                if PRETEST.search(mat):
                    pretest_rows += 1
                    continue
                out = {}
                for c, i in out_idx:
                    v = num(r[i] if i < len(r) else None)
                    if v is not None:
                        out[c] = v
                if o2 is None and pb is None and not mat and not fuel and not out:
                    continue
                rows_out.append({
                    "i": acc, "a": acr, "ph": ph, "r": rn,
                    "o2": o2, "p": round(pb, 4) if pb is not None else None,
                    "f": flow if flow is not None else (fr["v"] if fr else None),
                    "m": mat[:60], "fu": fuel[:40],
                    "o": outc or None, "x": out, **({"pd": 1} if pdoc else {}),
                    **({"fl": fr} if fr and fr["out"] else {}),
                    **({"ob": obs} if obs else {}),
                })
                got += 1
    per_inv[acc] = got

# BRE contributes one test point per (day, oxygen level) — the level at which
# flames were lit that day — and carries the day's flame count on each. A row
# with no readable level still becomes one point with o2 None, so the day is not
# lost; the raw cell travels with it.
for _rn, _d in enumerate(BRE_DAYS, 1):
    raw_rows["PSI-20"] = raw_rows.get("PSI-20", 0) + 1
    for _lvl in (_d["lvl"] or [None]):
        rows_out.append({
            "i": "PSI-20", "a": "BRE", "ph": "emulator", "r": _rn,
            "o2": _lvl, "p": None, "f": None, "m": "", "fu": _d["fuel"][:40],
            "o": None,
            "x": {k: v for k, v in (("flames", _d["fl"]), ("burner_mm", _d["mm"])) if v is not None},
            "day": _d["d"], "raw": _d["raw"],
        })
per_inv["PSI-20"] = sum(1 for r in rows_out if r["i"] == "PSI-20")

# ---- coverage grid -------------------------------------------------------
# The operational question: at which (O2, pressure) combinations do we have data?
EDGES_O2 = [0.15, 0.21, 0.25, 0.30, 0.40, 0.50, 0.70, 0.90]
EDGES_P = [0.0, 0.3, 0.5, 0.7, 1.0, 1.5, 2.0, 3.5]
def binof(x, edges):
    for k in range(len(edges) - 1):
        if edges[k] <= x < edges[k + 1]:
            return k
    return None

grid = defaultdict(Counter)
for r in rows_out:
    if r["o2"] is None or r["p"] is None:
        continue
    a, b = binof(r["o2"], EDGES_O2), binof(r["p"], EDGES_P)
    if a is not None and b is not None:
        grid[(b, a)][r["i"]] += 1

cell_counts = [[0] * (len(EDGES_O2) - 1) for _ in EDGES_P[:-1]]
cell_phases = [[""] * (len(EDGES_O2) - 1) for _ in EDGES_P[:-1]]
for (b, a), c in grid.items():
    cell_counts[b][a] = sum(c.values())
    cell_phases[b][a] = ",".join(sorted({INV[k][2] for k in c}))

# ---- the lunar base operating point --------------------------------------
# NASA's Artemis Surface Habitat reference design: "a nominal atmospheric
# operating pressure of 10.2 psia and 26.5% oxygen concentration and a
# capability of operating at 8.2 psia and 34% oxygen" (Kessler et al., "Artemis
# Deep Space Habitation", IEEE Aerospace 2022, NTRS 20220000245). Both modes are
# audited; the nominal one is the default. 10.2 psia = 0.703 bar.
LUNAR_P, LUNAR_O2 = 0.703, 0.265
ALT_P, ALT_O2 = 0.565, 0.34
full = [r for r in rows_out if r["o2"] is not None and r["p"] is not None]

# The solid-material question, stated so that it is falsifiable: how many solid
# points record an oxygen level, how many record a pressure, and how many of
# those sit above the lunar nominal level?
solid = [r for r in rows_out if r["ph"] == "solid"]
solid_o2 = [r for r in solid if r["o2"] is not None]
solid_p = [r for r in solid if r["p"] is not None]
above = [r for r in solid_o2 if r["o2"] > LUNAR_O2]
solid_max_o2 = max(r["o2"] for r in solid_o2) if solid_o2 else None

# Two-sided window around the design point, for the atmosphere map.
near = [r for r in rows_out
        if r["p"] is not None and abs(r["p"] - LUNAR_P) <= 0.03
        and r["o2"] is not None and r["o2"] >= LUNAR_O2]

# The 8.2 psia / 34% mode the same paper describes as a capability. CFI-G
# covers it for gases (19 points); no solid-material test sits at that
# pressure at all, which is the half of the answer that matters.
near_alt = [r for r in rows_out
            if r["p"] is not None and abs(r["p"] - ALT_P) <= 0.03
            and r["o2"] is not None and r["o2"] >= ALT_O2]

# ---- evidence outside PSI ------------------------------------------------
# Not test points: the archive does not hold them, and nothing below is drawn
# on the map or counted in the envelope. It is named so the page can say where
# the PSI gap is a publication gap rather than a knowledge gap. Values are the
# abstract's own: "diffusion flame extinction limits of 4-cm diameter PMMA
# (polymethacrylate) spheres", "oxygen concentrations (13 % to 34 %)",
# "pressure (0.15-1.1 atm)", "forced flows (0.2 to 80 cm/s)", "aboard the
# International Space Station" (James, Li, Ferkul, Olson, Johnston,
# Combustion and Flame 277, 114244, 2025).
ATM_BAR = 1.01325
OUTSIDE_PSI = {
    "sofie_gel": {
        "name": "SoFIE-GEL", "where": "ISS", "fuel": "PMMA spheres, 4 cm diameter",
        "fuel_en": "4 cm PMMA spheres", "fuel_pl": "kule PMMA o średnicy 4 cm",
        "o2_pct": [13, 34], "p_atm": [0.15, 1.1],
        "p_bar": [round(0.15 * ATM_BAR, 3), round(1.1 * ATM_BAR, 3)],
        "flow_cm_s": [0.2, 80], "year": 2025,
        "source": "James, Li, Ferkul, Olson & Johnston, Combustion and Flame 277, 114244 (2025)",
        "doi": "10.1016/j.combustflame.2025.114244",
    },
}

lunar = {
    "target_pressure_bar": LUNAR_P,
    "target_o2_frac": LUNAR_O2,
    "alternate": {"pressure_bar": ALT_P, "o2_frac": ALT_O2,
                  "near": len(near_alt),
                  "rows_with_pressure_near": sum(
                      1 for r in rows_out if r["p"] is not None and abs(r["p"] - ALT_P) <= 0.03)},
    "source": "Kessler et al., Artemis Deep Space Habitation, IEEE Aerospace 2022, NTRS 20220000245",
    "rows_with_o2_and_pressure": len(full),
    "solid_total": len(solid),
    "solid_with_o2": len(solid_o2),
    "solid_with_pressure": len(solid_p),
    "pressure_doc": {
        "in_table": sum(1 for r in solid_p if not r.get("pd")),
        "documented_elsewhere": {k: sum(1 for r in solid if r["i"] == k)
                                 for k in PRESSURE_DOC},
        "sources": {k: v[2] for k, v in PRESSURE_DOC.items()},
        "no_pressure": sum(1 for r in solid if r["p"] is None),
        "min_bar": round(min([r["p"] for r in solid_p] +
                             [v[0] for v in PRESSURE_DOC.values()]), 4),
        "max_bar": round(max([r["p"] for r in solid_p] +
                             [v[1] for v in PRESSURE_DOC.values()]), 4),
    },
    "solid_above_target_o2": len(above),
    "solid_max_o2": round(solid_max_o2, 4) if solid_max_o2 else None,
    # Distance from the solid ceiling to each Artemis mode, in percentage points.
    # The page typed "3.8" by hand; it now reads these.
    "gap_nominal_pp": round((LUNAR_O2 - solid_max_o2) * 100, 1) if solid_max_o2 else None,
    "gap_capability_pp": round((ALT_O2 - solid_max_o2) * 100, 1) if solid_max_o2 else None,
    "near_design_point": len(near),
    "near_design_point_phases": dict(Counter(r["ph"] for r in near)),
    "pretest_rows_excluded": pretest_rows,
}

# The only measurements near the design point are FLEX droplets, and FLEX
# records what happened to each one. Two cohorts, same diluent, same
# experiment: near the design pressure at 30-34% oxygen, and cabin air. Neither
# cohort is the design atmosphere — the oxygen differs between them — so this is
# an analogue. It is the one place in the corpus where the answer is an outcome
# rather than a coverage count.
def tally(sel):
    return dict(Counter(r[2] for r in sel))

flex = cohorts.get("PSI-69", [])
at_1atm = lambda r: abs(r[0] - 1.01325) <= 0.03
dp_design = [r for r in flex if r[3] and abs(r[0] - LUNAR_P) <= 0.03 and r[1] >= LUNAR_O2]
# Cabin air, held to 21% so the control is one atmosphere and one oxygen level —
# the earlier "<= 21%" control pulled in 12-18% tests and compared two things.
dp_air = [r for r in flex if r[3] and at_1atm(r) and abs(r[1] - 0.21) <= 0.005]
# Same oxygen as the design cohort, cabin pressure: isolates the pressure axis.
dp_air_hi = [r for r in flex if r[3] and at_1atm(r) and r[1] >= LUNAR_O2]
if dp_design and dp_air:
    lunar["design_point"] = {
        "investigation": "PSI-69", "phase": "droplet", "diluent": "nitrogen",
        "design": {"tests": len(dp_design), "outcomes": tally(dp_design)},
        "air": {"tests": len(dp_air), "outcomes": tally(dp_air)},
        "air_hi": {"tests": len(dp_air_hi), "outcomes": tally(dp_air_hi)},
    }

# ---- the operating point, as the challenge states it ----------------------
# The challenge names the lunar atmosphere itself: oxygen "will likely be 30%
# or greater, with a corresponding pressure of 10.2 psi or less", and a suit
# "filled with 100% oxygen to only 4.3 psi". That sentence, not a paper, is the
# primary reference point: >=30% O2 at <=10.2 psi. The Artemis paper's 26.5% /
# 34% figures stay as the second marker, because they are a named design and
# they are what the archive was already being scored against.
#
# The pressure the challenge gives is a CEILING ("10.2 psi or less"), so the
# envelope needs a floor or it swallows every vacuum test in the corpus. The
# floor is the only other pressure the same sentence names: the 4.3 psi suit.
CH_O2, CH_P = 0.30, 10.2 * PSI_BAR
SUIT_P = 4.3 * PSI_BAR
# FLEX runs at 0.702-0.726 bar against a 0.703 bar ceiling — 3% above it. The
# envelope is stated with a tolerance and the tolerance is stated with it, so
# the map, the card and the solver cannot disagree about whether FLEX is inside.
CH_TOL = 0.05

challenge = {
    "o2_frac": CH_O2, "pressure_bar": round(CH_P, 4), "pressure_psi": 10.2,
    "suit_pressure_bar": round(SUIT_P, 4), "suit_o2_frac": 1.0,
    "tolerance": CH_TOL,
    "quote": "will likely be 30% or greater, with a corresponding pressure of 10.2 psi or less",
    "suit_quote": "filled with 100% oxygen to only 4.3 psi",
    "gap_pp": round((CH_O2 - max(r["o2"] for r in rows_out
                                 if r["ph"] == "solid" and r["o2"] is not None)) * 100, 1),
}

def in_envelope(r):
    return (r["o2"] is not None and r["p"] is not None
            and r["o2"] >= CH_O2
            and r["p"] <= CH_P * (1 + CH_TOL)
            and r["p"] >= SUIT_P)

env_rows = [r for r in rows_out if in_envelope(r)]
challenge["envelope"] = {ph: sum(1 for r in env_rows if r["ph"] == ph)
                         for ph in sorted({r["ph"] for r in env_rows})}
challenge["envelope_total"] = len(env_rows)
# The materials-flammability emulator is the only class that reaches the
# challenge's oxygen level at all, and it records no pressure.
challenge["bre_reaches"] = bool(bre["o2_max"] is not None and bre["o2_max"] >= CH_O2)

# ---- the three pillars, each with a number that comes from a row -----------
# Prevention: the ceiling and the emulator. Suppression: what a diluent did at
# one atmosphere in FLEX. Detection: the smoke instruments. Each is computed
# here so the card on screen cannot drift from the table it cites.
def flex_cohort(diluent, lo, hi):
    """Extinction count and cohort size for one diluent in one oxygen band.

    Diluent is carried per test row by the four composition columns; a row with
    any helium is a helium test, otherwise any CO2 is a CO2 test, otherwise it is
    the nitrogen series. Filtering by oxygen band only would pool all three and
    compare a nitrogen result against a helium one.

    Pressure is filtered too, because the card this feeds says "at one
    atmosphere". Without it the CO2 cohort at 21% O2 mixed 0.71, 1.02 and
    2.06-3.09 bar runs and the helium cohort was 5 runs at 0.71 bar against 2 at
    1.02. At one atmosphere the 21% cohorts are 3 and 2 tests — too small to
    compare — which is why the card leads with the <=18% row instead.
    """
    sel = [r for r in cohorts.get("PSI-69", [])
           if r[4] == diluent and lo < r[1] <= hi and abs(r[0] - ATM_BAR) <= 0.03]
    return {"tests": len(sel), "ext": sum(1 for r in sel if r[2] == "Extinction")}

DIL = {"N2": "nitrogen", "CO2": "CO2", "He": "helium"}
suppression = {}
for _k, _name in DIL.items():
    suppression[_k] = {
        "diluent": _name,
        "air": flex_cohort(_k, 0.205, 0.215),
        "low": flex_cohort(_k, 0.0, 0.18),
    }
# Same diluent, same oxygen level, three different inert gases. At <=18% O2 the
# three rates sit within a few points of each other, so at that level the choice
# of diluent is not what decides the outcome. At 21% the CO2 and helium cohorts
# are 3 and 2 tests at one atmosphere — too small to compare, and the card says
# so instead of quoting a rate off two runs.
suppression["at_21_total"] = sum(suppression[k]["air"]["tests"] for k in DIL)

# ---- suppression as BASS's own operators recorded it ------------------------
# The FLEX cohorts above are droplets. BASS is the solid-material campaign, and
# its as-run matrix carries an operator note on 121 of its 122 test rows — prose
# written during the run. 25 of them mention nitrogen, for two different jobs:
# lowering the oxygen in the glovebox before a test (vitiation), and trying to
# blow a burning sample out with the nitrogen nozzle.
#
# These notes were read one by one, not pattern-matched. A first version used
# regular expressions and reported 15 attempts, 13 failing: it missed "turned
# nitrogen on full", counted a vitiation run, and read "N2 extinguishment. Flame
# doesn't go out until fan goes to 38" as a success. The operators write "no
# joy", "flame remained", "did eventually extinguish it" — a reading, not a
# keyword. So the reading is written down here, row by row, with the words it
# rests on, and the build fails if those words are not in the note or if a
# nitrogen note is missing from the table.
_N2 = re.compile(r"\bN2\b|nitrogen|\bGN2\b|\bN₂\b", re.I)
# BASS table row -> (reading, how the flame ended, words from the note)
#   reading: worked | failed | vitiation | other
#   ended:   flow_off | flow_reduced | None (the note does not say)
N2_READ = {
    3:  ("failed", "flow_off", "N2 did not extinguish wake"),
    8:  ("failed", "flow_reduced", "Flame doesn't go out until fan goes to 38"),
    14: ("other", None, "GN2 cal"),
    15: ("failed", "flow_reduced", "did not extinguish, increased to pot 10"),
    16: ("failed", "flow_off", "still have a pimple of soot"),
    26: ("failed", "flow_off", "flame remained side stabilized"),
    27: ("failed", None, "flame opened up and became side stabilized"),
    32: ("failed", "flow_off", "did not blow out even leading edge"),
    37: ("failed", "flow_off", "Flame did not go out completely"),
    42: ("failed", "flow_off", "N2 on and flame brightened and stabilized"),
    52: ("failed", "flow_off", "Then it strengthened again and got sooty"),
    53: ("failed", "flow_off", "flame still very sooty"),
    54: ("worked", None, "did eventually extinguish it"),
    55: ("other", None, "N2 repress going on"),
    61: ("failed", None, "Did not blow out either at high flow or with GN2"),
    62: ("failed", None, "blew out bottom half, but not top half"),
    63: ("worked", None, "flame did blow out with GN2"),
    64: ("failed", None, "did not blow out at 10"),
    76: ("failed", "flow_off", "flame persisted for a long time, went out when fan off"),
    82: ("vitiation", None, "1st vititation test"),
    89: ("vitiation", None, "final O2 is 17.3%"),
    90: ("vitiation", None, "started GN2 at"),
    92: ("vitiation", None, "vitiation to 17.3 % o2"),
    93: ("vitiation", None, "Gn2 start, max"),
    97: ("failed", "flow_off", "No joy even at max GN2"),
}
_ws = lambda t: re.sub(r"\s+", " ", t or "").strip()
_note_rows = [r for r in rows_out if r["i"] == "PSI-26" and r.get("ob")]
_n2_rows = [r for r in _note_rows if _N2.search(r["ob"])]
_unread = sorted({r["r"] for r in _n2_rows} ^ set(N2_READ))
if _unread:
    sys.exit(f"N2_READ is out of step with the BASS notes: rows {_unread}")
for _r in _n2_rows:
    if _ws(N2_READ[_r["r"]][2]).lower() not in _ws(_r["ob"]).lower():
        sys.exit(f"N2_READ row {_r['r']}: words not in the note: {N2_READ[_r['r']][2]!r}")
_att = [r for r in _n2_rows if N2_READ[r["r"]][0] in ("worked", "failed")]
_fail = [r for r in _att if N2_READ[r["r"]][0] == "failed"]
suppression["solid_notes"] = {
    "rows_with_note": len(_note_rows),
    "nitrogen_mentioned": len(_n2_rows),
    "nitrogen_vitiation": sum(1 for r in _n2_rows if N2_READ[r["r"]][0] == "vitiation"),
    "nitrogen_attempts": len(_att),
    "nitrogen_recorded_failing": len(_fail),
    "nitrogen_recorded_working": len(_att) - len(_fail),
    "failed_ended_flow_off": sum(1 for r in _fail if N2_READ[r["r"]][1] == "flow_off"),
    "failed_ended_flow_reduced": sum(1 for r in _fail if N2_READ[r["r"]][1] == "flow_reduced"),
    "failed_end_not_stated": sum(1 for r in _fail if N2_READ[r["r"]][1] is None),
    "o2_range": [min(r["o2"] for r in _att if r.get("o2") is not None),
                 max(r["o2"] for r in _att if r.get("o2") is not None)],
    "n2_example_worked": next((_ws(r["ob"]) for r in _att
                               if N2_READ[r["r"]][0] == "worked" and len(r["ob"]) < 80), None),
    # Every nitrogen note with its reading, so each count can be checked
    # against the operator's own words.
    "evidence": [{"r": r["r"], "o2": r["o2"], "read": N2_READ[r["r"]][0],
                  "ended": N2_READ[r["r"]][1], "words": N2_READ[r["r"]][2],
                  "note": _ws(r["ob"])[:420]}
                 for r in _n2_rows],
}

# What each detection accession actually measured, from its own table columns.
def cols_of(acc, suffix):
    for fn in os.listdir(os.path.join(SRC, acc)):
        if fn.endswith(suffix) and "Experimental table" in fn:
            with open(os.path.join(SRC, acc, fn), encoding="utf-8-sig",
                      errors="replace", newline="") as fh:
                return [h.strip() for h in next(csv.reader(fh), [])]
    return []

detection = {}
for _acc, _suffix in (("PSI-101", "SAME-R.csv"), ("PSI-102", "SAME.csv"), ("PSI-47", "DAFT.csv")):
    _rows = [r for r in rows_out if r["i"] == _acc]
    _cols = cols_of(_acc, _suffix)
    detection[_acc] = {
        "acronym": INV[_acc][0], "rows": len(_rows),
        "columns": [c for c in _cols if c][:40],
        "measured": [c for c in _cols if re.search(
            r"velocity|flow|Rt/R0|R0|ageing|aging|duration|weight|size|diameter|material|type",
            c, re.I)],
    }

# Which test the ceiling is. A live answer credited it to BASS-II; it is a BASS
# row, and naming the row is the only way a reader can check that.
_ceil_row = max((r for r in rows_out if r["ph"] == "solid" and r["o2"] is not None),
                key=lambda r: r["o2"])
PILLAR_FACTS = {
    "prevention": {
        "solid_ceiling": round(_ceil_row["o2"], 4),
        # The same number in percent, one decimal: the form every sentence uses.
        # The model was handed only the fraction and once wrote "0.2272".
        "solid_ceiling_pct": round(_ceil_row["o2"] * 100, 1),
        "solid_ceiling_at": {"investigation": _ceil_row["i"], "acronym": _ceil_row["a"],
                             "row": _ceil_row["r"], "material": _ceil_row["m"],
                             "pressure_bar": _ceil_row["p"]},
        "solid_points": sum(1 for r in rows_out if r["ph"] == "solid"),
        "bre_days": bre["n_days"], "bre_flames": bre["flames"],
        "bre_o2": [bre["o2_min"], bre["o2_max"]],
        "bre_o2_pct": [round(bre["o2_min"] * 100, 1), round(bre["o2_max"] * 100, 1)],
    },
    "suppression": suppression,
    "detection": detection,
}

# ---- per-investigation summary -------------------------------------------
summary = []
for acc in sorted(INV):
    acr, name, phase, pillars = INV[acc]
    rs = [r for r in rows_out if r["i"] == acc]
    o2s = [r["o2"] for r in rs if r["o2"] is not None]
    ps = [r["p"] for r in rs if r["p"] is not None]
    fs = [r["f"] for r in rs if r["f"] is not None]
    mats = sorted({r["m"] for r in rs if r["m"]})
    summary.append({
        "id": acc, "acronym": acr, "name": name, "phase": phase, "pillars": pillars,
        "rows": len(rs), "raw_rows": raw_rows.get(acc, 0),
        "has_o2": bool(o2s), "has_pressure": bool(ps), "has_flow": bool(fs),
        "o2": [round(min(o2s), 3), round(max(o2s), 3)] if o2s else None,
        "p": [round(min(ps), 3), round(max(ps), 3)] if ps else None,
        "materials": mats[:12], "n_materials": len(mats),
        "outcomes": sorted({k for r in rs for k in r["x"]}),
    })

# Size of the corpus actually sitting in data/, so the page never hardcodes it.
def corpus_stats():
    n = b = 0
    for root, _, files in os.walk(SRC):
        for f in files:
            n += 1
            b += os.path.getsize(os.path.join(root, f))
    return n, round(b / 1e9, 1)

n_files, gb = corpus_stats()

def funnel_math(rows, blanks, bre_info, pretest):
    """The funnel's arithmetic, so every surface quotes the same numbers.

    2,870 published rows, 959 of them rejected for a named cause, leaves 1,911
    rows that become test points — and 1,936 points, because BRE's 18 test-day
    rows each list several oxygen levels and become one point per level. The
    row count and the point count differ by exactly that expansion, and saying
    so is cheaper than having a judge discover it.
    """
    raw = raw_rows
    published = sum(raw.values())
    # Rejections are rows that did not become a point, not rows that were read:
    # Saffire's 19 rows include 11 that are points and 8 that are not.
    lost = lambda a: raw.get(a, 0) - sum(1 for r in rows if r["i"] == a)
    unmapped = sum(raw[a] for a in ("PSI-21", "PSI-22", "PSI-23"))
    digest = lost("PSI-142")
    saffire = lost("PSI-98") + lost("PSI-99")
    rejected = blanks + unmapped + digest + saffire
    kept = published - rejected
    bre_rows, bre_points = bre_info["n_days"], sum(1 for r in rows if r["i"] == "PSI-20")
    return {
        "published_rows": published,
        "rejected_rows": rejected,
        "rejected_by_cause": {
            "blank": blanks, "unmapped_tables": unmapped,
            "summary_sheet": digest, "saffire": saffire,
        },
        "rows_kept": kept,
        "test_points": len(rows),
        "bre_rows": bre_rows,
        "bre_points": bre_points,
        "bre_expansion": bre_points - bre_rows,
        # kept - bre_rows + bre_points == test_points, by construction.
        "checks_out": kept - bre_rows + bre_points == len(rows),
        "pretest_rows": pretest,
    }

# Figures the documents and the deck quote, computed here so none is typed by
# hand (scripts/check_docs.py fails on any number not in this file).
_flow = [r for r in rows_out if r["f"] is not None and r["o2"] is not None]
_flow_solid = [r for r in _flow if r["ph"] == "solid"]
_ext = [r for r in _flow_solid if r.get("fl", {}).get("out") == "extinction"]
_blow = [r for r in _flow_solid if r.get("fl", {}).get("out") == "blowoff"]
_rng = lambda rs: [round(min(r["o2"] for r in rs) * 100, 1), round(max(r["o2"] for r in rs) * 100, 1)] if rs else None
DOC_FIGURES = {
    "flow": {
        "points_with_flow_and_o2": len(_flow), "solid": len(_flow_solid),
        "with_outcome": len(_ext) + len(_blow), "extinction": len(_ext), "blowoff": len(_blow),
        "extinction_after_reducing_flow": sum(1 for r in _ext if r["fl"].get("ramp")),
        "o2_range_extinction_pct": _rng(_ext), "o2_range_blowoff_pct": _rng(_blow),
    },
    "points_by_phase": {ph: sum(1 for r in rows_out if r["ph"] == ph) for ph in sorted({r["ph"] for r in rows_out})},
    "smoke_and_dust_points": sum(1 for r in rows_out if r["ph"] in ("aerosol", "dust")),
    "psia": {"artemis_nominal": 10.2, "artemis_capability": 8.2, "suit": 4.3, "sea_level": 14.7},
}

# ---- the campaign that would close the gap --------------------------------
# Computed, not designed: the material classes are those tested within 1 pp of
# the solid ceiling (candle and paraffin are left out as model fuels, not cabin
# materials); the atmospheres are the three oxygen levels the challenge and
# Kessler et al. name, at the two pressures Kessler names; the replicate count
# is the median number of BASS/BASS-II tests per (material, oxygen) condition;
# the flow range is what BASS/BASS-II used for those classes.
CAMPAIGN_CLASSES = [("SIBAL fabric", ("sibal", "cotton-fiberglass")), ("PMMA", ("pmma", "sphere", "rod", "film")),
                    ("Nomex", ("nomex",)), ("Ultem", ("ultem",)), ("Silicone", ("silicone",))]
def _cls(m):
    m = (m or "").lower()
    for name, keys in CAMPAIGN_CLASSES:
        if any(k in m for k in keys):
            return name
    return None
_sol = [r for r in rows_out if r["ph"] == "solid" and r["o2"] is not None]
_ceil = max(r["o2"] for r in _sol)
_near_ceiling = {_cls(r["m"]) for r in _sol if r["o2"] >= _ceil - 0.01} - {None}
_bass = [r for r in _sol if r["i"] in ("PSI-25", "PSI-26")]
_reps = {}
for r in _bass:
    k = (r["i"], r["m"], round(r["o2"], 3))
    _reps[k] = _reps.get(k, 0) + 1
_rv = sorted(_reps.values())
_flows = [r["f"] for r in _bass if r["f"] is not None and _cls(r["m"]) in _near_ceiling]
_levels = [round(LUNAR_O2 * 100, 1), round(CH_O2 * 100, 1), round(ALT_O2 * 100, 1)]
_press = [LUNAR_P, ALT_P]
_cells = []
for name, _ in CAMPAIGN_CLASSES:
    if name not in _near_ceiling:
        continue
    pts = [r for r in _sol if _cls(r["m"]) == name and r["p"] is not None]
    for o in _levels:
        for pb in _press:
            best = min(pts, key=lambda r: (abs(r["o2"] * 100 - o), abs(math.log(r["p"] / pb)))) if pts else None
            _cells.append({"class": name, "o2_pct": o, "p_bar": pb,
                           "nearest": None if not best else {
                               "i": best["i"], "row": best["r"], "o2_pct": round(best["o2"] * 100, 1), "p_bar": round(best["p"], 3),
                               "oxygen_distance_pp": round(best["o2"] * 100 - o, 1),
                               "pressure_distance_pct": round((best["p"] - pb) / pb * 100)}})
CAMPAIGN = {
    "classes": [n for n, _ in CAMPAIGN_CLASSES if n in _near_ceiling],
    "o2_levels_pct": _levels, "pressures_bar": _press,
    "replicates": _rv[len(_rv) // 2], "conditions_in_bass": len(_rv),
    "conditions_with_that_many": sum(1 for v in _rv if v == _rv[len(_rv) // 2]),
    "flow_cm_s": [min(_flows), max(_flows)] if _flows else None,
    "cells": _cells,
    "tests": len(_cells) * _rv[len(_rv) // 2],
    "step_zero": "publish the SoFIE-GEL points in PSI",
}

data = {
    "meta": {
        "source": "NASA Physical Science Informatics (PSI)",
        "license": "CC0-1.0",
        "investigations": len(INV),
        "tables": sum(len(v) for v in SPEC.values()) + (1 if BRE_FILE else 0),
        "testpoints": len(rows_out),
        "rows_with_o2_and_pressure": len(full),
        "blank_rows": blank_rows,
        "files": n_files,
        "gigabytes": gb,
    },
    # The funnel's arithmetic, computed once here so the page, the deck and the
    # talk cannot each do it differently. published_rows - rejected_rows is the
    # rows that become test points; BRE is why the point count is higher than
    # that row count, and the difference is spelled out rather than left as a
    # discrepancy somebody has to notice.
    "funnel": funnel_math(rows_out, blank_rows, bre, pretest_rows),
    "grid": {"o2_edges": EDGES_O2, "p_edges": EDGES_P,
             "counts": cell_counts, "phases": cell_phases},
    "lunar": lunar,
    "outside_psi": OUTSIDE_PSI,
    "doc_figures": DOC_FIGURES,
    "campaign": CAMPAIGN,
    "challenge": challenge,
    "pillars": PILLAR_FACTS,
    "bre": bre,
    "investigations": summary,
    "testpoints": rows_out,
    "warnings": warnings,
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as fh:
    fh.write("window.DATASET = ")
    json.dump(data, fh, separators=(",", ":"))
    fh.write(";\n")

# The "Ask IGNIS" worker reads the same numbers the page draws, from this file,
# so the chat and the dashboard cannot disagree. Verified quotes come from
# app/data/insights.js and are addressed by id ("PSI-26.objective"): the model
# cites the id, the page prints the verified text, the model never retypes it.
WORKER_OUT = "worker/src/corpus.json"
_ins = open("app/data/insights.js", encoding="utf-8").read()
_ins = json.loads(_ins[_ins.index("{"):_ins.rindex("}") + 1])
quotes = {f"{acc}.{k}": v for acc, rec in _ins.items() for k, v in rec.items()
          if k != "summary" and isinstance(v, dict) and v.get("q")}
# The On Earth card's sources, cited as [Q:EARTH.detector] and so on.
_earth = open("app/data/earth.js", encoding="utf-8").read()
quotes |= {f"EARTH.{k}": v for k, v in
           json.loads(_earth[_earth.index("{"):_earth.rindex("}") + 1]).items()}
os.makedirs(os.path.dirname(WORKER_OUT), exist_ok=True)
with open(WORKER_OUT, "w", encoding="utf-8") as fh:
    json.dump({k: data[k] for k in ("meta", "funnel", "lunar", "outside_psi", "challenge", "pillars",
                                    "bre", "investigations", "testpoints")}
              | {"quotes": quotes}, fh, separators=(",", ":"), ensure_ascii=False)

print(f"testpoints: {len(rows_out)}")
print(f"with O2+pressure: {len(full)}")
print(f"solid: {len(solid)}  with O2: {len(solid_o2)}  with pressure: {len(solid_p)}"
      f"  above {LUNAR_O2:.0%} O2: {len(above)}")
print(f"solid O2 ceiling: {solid_max_o2:.1%}" if solid_max_o2 else "solid O2 ceiling: none")
print(f"near design point (+/-0.03 bar, >={LUNAR_O2:.0%} O2): {len(near)} {dict(Counter(r['ph'] for r in near))}")
print(f"excluded pre-test flow-visualisation rows: {pretest_rows}")
print(f"empty rows: {blank_rows}   corpus: {n_files} files, {gb} GB")
print(f"wrote {OUT} ({os.path.getsize(OUT)/1e6:.2f} MB)")
for w in warnings:
    print("  warn:", w)
