"""Every number in the documents and the deck must be one the build computed.

python3 scripts/check_docs.py  — exits 1 and lists each number in README.md,
SUBMISSION.md, pitch/TALK.md or pitch/index.html that appears nowhere in
app/data/dataset.js (in any of the forms the page prints it: as stored, as a
percentage, rounded to 0-3 decimals). Numbers that are not data — years,
units in a unit conversion, slide timings, version strings — are listed in
ALLOW with the reason; anything else unmatched is a hand-typed number.
Standard library only.
"""
import html
import json
import re
import sys

DOCS = ["README.md", "SUBMISSION.md", "pitch/TALK.md", "pitch/index.html", "pitch/FILM.md"]


def walk(x, out):
    if isinstance(x, bool):
        return
    if isinstance(x, (int, float)):
        out.add(x)
    elif isinstance(x, str):
        for m in re.finditer(r"\d+(?:\.\d+)?", x):
            out.add(float(m.group()))
    elif isinstance(x, dict):
        for k, v in x.items():
            walk(k, out)
            walk(v, out)
    elif isinstance(x, list):
        for v in x:
            walk(v, out)


def forms(values):
    known = set()
    for v in values:
        for x in (v, v * 100):
            for d in (0, 1, 2, 3, 4):
                known.add(round(x, d))
    return known


def numbers(text):
    text = re.sub(r"<(style|script|svg)\b.*?</\1>", " ", text, flags=re.S | re.I)
    text = html.unescape(re.sub(r"<[^>]+>", " ", text))
    text = re.sub(r"`[^`]*`", " ", text)                      # code spans: paths, commands
    text = re.sub(r"https?://\S+", " ", text)                 # links
    text = re.sub(r"\b(?:PSI|NTRS|STP)[- ]?\d+\b", " ", text)  # ids
    text = re.sub(r"\b[A-Za-z]+-?\d[\w-]*\b", " ", text)       # CO2, C2H4, BASS-II, m157
    text = re.sub(r"[₀-₉]", "", text)
    out = []
    for m in re.finditer(r"(?<![\w.])\d{1,3}(?:[, ]\d{3})+(?![\d])|\d+(?:[.,]\d+)?", text):
        raw = m.group()
        if re.fullmatch(r"\d{1,3}(?:[, ]\d{3})+", raw):
            val = float(re.sub(r"[, ]", "", raw))
        else:
            val = float(raw.replace(",", "."))
        out.append((raw, val, text[max(0, m.start() - 40):m.end() + 20].replace("\n", " ")))
    return out


def main():
    src = open("app/data/dataset.js", encoding="utf-8").read()
    data = json.loads(src[src.index("{"):src.rindex("}") + 1])
    values = set()
    walk({k: v for k, v in data.items() if k != "testpoints"}, values)
    # Test-point values are data too, but 1,936 rows of them would match almost
    # anything; only their ranges per phase and investigation are allowed.
    # The telemetry build's counts and the quote files' sizes are data too.
    tel = open("app/data/telemetry.js", encoding="utf-8").read()
    tel = json.loads(tel[tel.index("{"):tel.rindex("}") + 1])
    walk({k: v for k, v in tel.items() if k != "series"}, values)
    values.add(len(tel["series"]))
    ins = open("app/data/insights.js", encoding="utf-8").read()
    ins = json.loads(ins[ins.index("{"):ins.rindex("}") + 1])
    qs = [v for rec in ins.values() for v in rec.values() if isinstance(v, dict) and v.get("q")]
    psi_q = sum(1 for v in qs if not v.get("ext"))           # from the PSI documents
    guide_q = len(qs) - psi_q                                 # NASA 2015 guide, in insights.js
    ear = open("app/data/earth.js", encoding="utf-8").read()
    ear_q = len(json.loads(ear[ear.index("{"):ear.rindex("}") + 1]))
    values |= {psi_q, guide_q + ear_q, psi_q + guide_q + ear_q}
    known = forms(values)
    allow = json.load(open("scripts/check_docs_allow.json", encoding="utf-8"))
    allowed = {float(k) for k in allow}
    bad = []
    for path in DOCS:
        for raw, val, ctx in numbers(open(path, encoding="utf-8").read()):
            if val in known or val in allowed or val < 2:
                continue
            bad.append(f"{path}: {raw}  …{ctx}…")
    for b in bad:
        print(b)
    print(f"check_docs: {len(bad)} number(s) not in dataset.js or the allow list")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
