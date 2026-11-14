#!/usr/bin/env python3
"""Extract real flame time series from CFI-G raw telemetry.

Joins the CFI-G experimental tables (atmosphere + outcome) to the raw 1 Hz
telemetry files (ion current, chamber pressure, burner temperature, fuel flow)
via the Test column, which matches the raw file name prefix once spaces are
stripped. Emits a small set of downsampled series for the dashboard.

Run from repo root:  python3 -I scripts/build_telemetry.py
"""
import csv, glob, json, os, re, sys

SRC = "data/psi_data/PSI-159"
OUT = "app/data/telemetry.js"
KEEP = 300          # samples per series after downsampling

CHANNELS = {
    "IonCurrent": ("ion", "ion current (flame presence)"),
    "PTA1":       ("p1", "chamber pressure A1"),
    "TCBurner":   ("tburn", "burner temperature"),
    "MFCA3FuelFlow": ("fuel", "fuel mass flow"),
}

def tsec(s):
    """'15:27:13', '2021-03-29 15:28:11', or '15:26:44:334' -> seconds."""
    m = re.search(r"(\d{1,2}):(\d{2}):(\d{2})(?::(\d{1,3}))?", s or "")
    if not m:
        return None
    h, mi, se, ms = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mi * 60 + se + ms / 1000.0

def read_tp(path):
    ev = {}
    for line in open(path, encoding="utf-8", errors="replace"):
        m = re.match(r"\s*([A-Za-z][^:]*):\s*(.+)$", line)
        if not m:
            continue
        k, v = m.group(1).strip(), m.group(2).strip()
        t = tsec(v)
        if t is not None:
            ev[k] = t
    return ev

def read_series(path):
    """First line is a metadata CSV; second is the real header."""
    with open(path, encoding="utf-8", errors="replace") as fh:
        lines = fh.read().splitlines()
    if len(lines) < 3:
        return None
    hdr = lines[1].split(",")
    idx = {h.strip(): i for i, h in enumerate(hdr)}
    want = {c: idx[c] for c in CHANNELS if c in idx}
    if "Time" not in idx:
        return None
    ti = idx["Time"]
    rows = []
    for line in lines[2:]:
        p = line.split(",")
        if len(p) <= ti:
            continue
        t = tsec(p[ti])
        if t is None:
            continue
        rows.append((t, {CHANNELS[c][0]: _f(p[i]) for c, i in want.items()}))
    return rows

def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def load_table(name):
    p = glob.glob(os.path.join(SRC, f"*Experimental table_{name}.csv"))
    if not p:
        return []
    with open(p[0], encoding="utf-8-sig", errors="replace") as fh:
        return list(csv.DictReader(fh))

def find_raw(prefix):
    hits = glob.glob(os.path.join(SRC, f"*Raw Data_{prefix}_data.csv"))
    tps = glob.glob(os.path.join(SRC, f"*Raw Data_{prefix}_TP.txt"))
    return (hits[0] if hits else None), (tps[0] if tps else None)

tests = []
for table in ("CFI-G_Normal Flames", "CFI-G_Inverse Flames"):
    for r in load_table(table):
        raw = (r.get("Test") or "").strip()
        if not raw:
            continue
        prefix = raw.replace(" ", "")
        data_p, tp_p = find_raw(prefix)
        if not data_p:
            continue
        try:
            o2 = float((r.get(" XO2 before test") or r.get("XO2") or "").strip())
            p = float((r.get("approx p (bar)") or "").strip())
        except ValueError:
            continue
        series = read_series(data_p)
        if not series:
            continue
        ev = read_tp(tp_p) if tp_p else {}
        ign = ev.get("Ignition and retraction")
        ext = ev.get("Extinction detected")
        t0 = series[0][0]
        span = series[-1][0] - t0
        if span <= 0:
            continue
        step = max(1, len(series) // KEEP)
        pts = series[::step]
        tests.append({
            "id": prefix,
            "table": table.split("_")[0],
            "fuel": (r.get("Fuel") or "").strip(),
            "o2": round(o2, 4),
            "p": round(p, 4),
            "burn_s": _f((r.get("burn time (sec)") or "").strip()),
            "outcome": (r.get("Self-ext or flow term") or "").strip(),
            "ignition_s": round(ign - t0, 1) if ign else None,
            "extinction_s": round(ext - t0, 1) if ext else None,
            "duration_s": round(span, 1),
            "t": [round(s[0] - t0, 1) for s in pts],
            "ion": [s[1].get("ion") for s in pts],
            "p1": [s[1].get("p1") for s in pts],
            "tburn": [s[1].get("tburn") for s in pts],
            "fflow": [s[1].get("fuel") for s in pts],
        })

# Keep only series where a flame actually burned: ion current must rise above
# its pre-ignition baseline between ignition and extinction.
def peak_ion(x):
    if x["ignition_s"] is None or x["extinction_s"] is None:
        return None
    base = [v for i, v in enumerate(x["ion"])
            if v is not None and x["t"][i] < x["ignition_s"]]
    lit = [v for i, v in enumerate(x["ion"])
           if v is not None and x["ignition_s"] <= x["t"][i] <= x["extinction_s"]]
    if not base or not lit:
        return None
    return max(lit) - (sum(base) / len(base))

tests = [t for t in tests if (peak_ion(t) or 0) > 0.3]
for t in tests:
    t["peak_ion"] = round(peak_ion(t), 3)

# Keep a demo set: clearest self-extinguishing flame, plus spread in O2/pressure.
def score(x):
    return (1 if x["outcome"] in ("SE", "SELF") else 0,
            x["extinction_s"] is not None,
            x["peak_ion"] or 0)

tests.sort(key=score, reverse=True)
# one per distinct O2/pressure pair, then fill
seen, picked = set(), []
for t in tests:
    k = (round(t["o2"], 2), round(t["p"], 2))
    if k in seen:
        continue
    seen.add(k)
    picked.append(t)
    if len(picked) >= 24:
        break
for t in tests:
    if len(picked) >= 40:
        break
    if t not in picked:
        picked.append(t)

picked.sort(key=lambda x: (x["p"], x["o2"]))

# How many extinction events exist across the raw archives, independent of how
# many series this script can join. A TP file records "Extinction detected: ***"
# when no extinction occurred, so only a parseable timestamp counts as an event.
def count_events():
    per = {}
    for acc in ("PSI-159", "PSI-10"):
        n = 0
        for p in glob.glob(os.path.join("data/psi_data", acc, "**", "*_TP.txt"), recursive=True):
            for line in open(p, encoding="utf-8", errors="replace"):
                if line.strip().startswith("Extinction detected") and tsec(line.split(":", 1)[-1]):
                    n += 1
                    break
        per[acc] = n
    return per

events = count_events()
total_events = sum(events.values())

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as fh:
    fh.write("window.TELEMETRY = ")
    json.dump({"series": picked, "channels": CHANNELS,
               "events": {"total": total_events, "by_investigation": events,
                          "joinable": len(tests),
                          "joined_series": len(picked)}},
              fh, separators=(",", ":"))
    fh.write(";\n")

n_ext = sum(1 for t in picked if t["extinction_s"] is not None)
print(f"series: {len(picked)} of {len(tests)} joinable tests, {n_ext} with detected extinction")
print(f"extinction events in raw archives: {total_events} {events}")
print(f"wrote {OUT} ({os.path.getsize(OUT)/1e6:.2f} MB)")
