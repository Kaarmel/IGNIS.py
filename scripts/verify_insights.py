#!/usr/bin/env python3
"""Check that every SI-extracted field in app/data/insights.js is quoted literally
from the PSI file it names.

The Atlas shows, per investigation, an objective / fuel / sample / varied / sensors /
apparatus / conclusion, each with a sentence lifted from a document in that accession.
This script re-reads those documents and fails if any quote is not in the one it
names. Exit code 0 = every quote verified, 1 = at least one is not.

    python3 -I scripts/verify_insights.py            # verify
    python3 -I scripts/verify_insights.py -v         # list every field checked

PDF text comes from `pdftotext` (poppler); DOCX is read with zipfile + ElementTree,
so the rest is stdlib. Without pdftotext the PDF quotes cannot be checked and the
script fails rather than passing silently.

A PDF is read twice, `-layout` and then plain, and a quote passes if it is in
either. `-layout` preserves tables, which is most of this corpus, but on a
two-column report it interleaves the columns and splits every sentence down the
middle — so a quote that a human reads straight off the page would be reported
missing. Plain extraction restores the column order. Both are faithful readings
of the same file; neither invents a word.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INSIGHTS = os.path.join(ROOT, "app", "data", "insights.js")
PSI = os.path.join(ROOT, "data", "psi_data")
# Sources outside the PSI archive (NASA's 2015 Researcher's Guide). A cell quoting
# one must say so with "ext": 1, and a cell saying so must quote one.
EXTERNAL = os.path.join(ROOT, "data", "external")
EARTH = os.path.join(ROOT, "app", "data", "earth.js")

FIELDS = ("objective", "fuel", "sample", "varied", "sensors", "apparatus", "conclusion")

_cache = {}


def norm(s):
    """Collapse whitespace so a sentence that wraps across PDF lines still matches.

    Nothing else is normalised: the words and their order must be the source's.
    """
    return re.sub(r"\s+", " ", s).strip()


def find_file(name, external=False):
    """Locate a source document by basename anywhere under data/psi_data/,
    or directly in data/external/ when the cell is marked external."""
    if external:
        p = os.path.join(EXTERNAL, name)
        return p if os.path.isfile(p) else None
    if not os.path.isdir(PSI):
        return None
    for acc in os.listdir(PSI):
        p = os.path.join(PSI, acc, name)
        if os.path.isfile(p):
            return p
    return None


def text_of(path):
    """Every faithful reading of the file, whitespace-normalised.

    A list, not a string: a PDF gets two readings (see the module docstring), and
    a quote passes if any one of them contains it.
    """
    if path in _cache:
        return _cache[path]
    ext = path.lower().rsplit(".", 1)[-1]
    if ext == "pdf":
        exe = shutil.which("pdftotext") or "/opt/homebrew/bin/pdftotext"
        if not os.path.exists(exe):
            raise RuntimeError("pdftotext not found — cannot verify PDF quotes")
        texts = []
        for flags in (["-layout"], []):
            out = subprocess.run([exe] + flags + ["-enc", "UTF-8", path, "-"],
                                 capture_output=True, text=True, check=True)
            texts.append(norm(out.stdout))
            # A compound split at a line end ("false-" / "alarm") reads as
            # "false- alarm"; rejoining it keeps the hyphen the page prints.
            texts.append(norm(re.sub(r"-\n\s*", "-", out.stdout)))
    elif ext == "docx":
        with zipfile.ZipFile(path) as z:
            xml = z.read("word/document.xml")
        # No DOCTYPE means no entity expansion, which is the only XML attack surface
        # left once external fetches are off (they are, by default, in ElementTree).
        if b"<!DOCTYPE" in xml or b"<!ENTITY" in xml:
            raise RuntimeError("refusing to parse a DOCX with a DTD")
        root = ET.fromstring(xml)
        ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
        # A paragraph is one line of the document; join its runs, then keep the breaks.
        paras = []
        for p in root.iter(ns + "p"):
            paras.append("".join(t.text or "" for t in p.iter(ns + "t")))
        texts = [norm("\n".join(paras))]
    else:
        with open(path, encoding="utf-8", errors="replace") as fh:
            texts = [norm(fh.read())]
    _cache[path] = texts
    return _cache[path]


def load(path=None, var="INSIGHTS"):
    """Pull a window.<var> object out of a data JS file."""
    path = path or INSIGHTS
    with open(path, encoding="utf-8") as fh:
        src = fh.read()
    m = re.search(r"window\.%s\s*=\s*(\{.*\})\s*;?\s*$" % var, src, re.S)
    if not m:
        sys.exit("verify_insights: could not find window.%s in %s" % (var, path))
    return json.loads(m.group(1))


def main():
    verbose = "-v" in sys.argv
    data = load()
    # The "On Earth" card's quotes go through the same check, as one more entry.
    data["EARTH"] = load(EARTH, "EARTH")
    bad, empty, checked = [], 0, 0
    for acc in sorted(data):
        entry = data[acc]
        for field in (sorted(entry) if acc == "EARTH" else FIELDS):
            cell = entry.get(field)
            if not cell:
                empty += 1
                if verbose:
                    print("  --  %-8s %-11s (not stated in the PSI files)" % (acc, field))
                continue
            quote, fname = cell.get("q", ""), cell.get("f", "")
            if not quote and not fname:
                # An empty pair is the honest answer for an accession whose PSI
                # folder holds only a table. A half-empty pair is a bug.
                empty += 1
                if verbose:
                    print("  --  %-8s %-11s (not stated in the PSI files)" % (acc, field))
                continue
            if not quote or not fname:
                bad.append((acc, field, "missing quote or file name"))
                continue
            ext = bool(cell.get("ext"))
            path = find_file(fname, ext)
            if not path:
                bad.append((acc, field, "no such file in %s: %s"
                            % ("data/external" if ext else "data/psi_data", fname)))
                continue
            try:
                bodies = text_of(path)
            except Exception as exc:  # noqa: BLE001 - report, do not abort the sweep
                bad.append((acc, field, "unreadable %s: %s" % (fname, exc)))
                continue
            checked += 1
            if not any(norm(quote) in body for body in bodies):
                bad.append((acc, field, "quote not found in %s" % fname))
            elif verbose:
                print("  ok  %-8s %-11s %s%s" % (acc, field, fname, "  [external]" if ext else ""))

    print("verify_insights: %d quotes checked, %d fields marked not stated, %d failures"
          % (checked, empty, len(bad)))
    for acc, field, why in bad:
        print("  FAIL %-8s %-11s %s" % (acc, field, why))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
