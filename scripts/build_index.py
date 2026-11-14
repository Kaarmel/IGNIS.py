#!/usr/bin/env python3
"""Build data/index.json from downloaded PSI files. Run from repo root."""
import json, os, csv, io, hashlib
from collections import defaultdict

ROOT = "data/psi_data"
OUT = "data/index.json"

def sha1(path, limit=8 * 1024 * 1024):
    h = hashlib.sha1()
    with open(path, "rb") as fh:
        while chunk := fh.read(1 << 20):
            h.update(chunk)
            if limit and fh.tell() > limit:
                break
    return h.hexdigest()

def head_csv(path):
    try:
        with open(path, encoding="utf-8-sig", errors="replace") as fh:
            r = csv.reader(io.StringIO(fh.read(65536)))
            rows = [next(r, []) for _ in range(3)]
            return {"columns": rows[0], "sample": rows[1] if len(rows) > 1 else []}
    except Exception:
        return None

index = {"source": "NASA PSI", "license": "CC0-1.0", "investigations": {}}
for acc in sorted(os.listdir(ROOT)):
    d = os.path.join(ROOT, acc)
    if not os.path.isdir(d):
        continue
    files = []
    for fn in sorted(os.listdir(d)):
        p = os.path.join(d, fn)
        if not os.path.isfile(p):
            continue
        e = {
            "name": fn,
            "bytes": os.path.getsize(p),
            "sha1": sha1(p),
            "category": fn.split("_")[1] if fn.count("_") > 1 else "other",
        }
        if fn.lower().endswith(".csv"):
            info = head_csv(p)
            if info:
                e["columns"] = info["columns"]
        files.append(e)
    index["investigations"][acc] = {
        "files": files,
        "count": len(files),
        "bytes": sum(f["bytes"] for f in files),
    }

index["totals"] = {
    "investigations": len(index["investigations"]),
    "files": sum(v["count"] for v in index["investigations"].values()),
    "bytes": sum(v["bytes"] for v in index["investigations"].values()),
}
with open(OUT, "w") as fh:
    json.dump(index, fh, indent=1)

t = index["totals"]
print(f"index.json: {t['investigations']} eksperymentów, {t['files']} plików, {t['bytes']/1e9:.2f} GB")
print(f"rozmiar indeksu: {os.path.getsize(OUT)/1e6:.1f} MB")
