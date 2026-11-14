#!/bin/sh
# One command for every check the submission claims:  sh scripts/check_all.sh
#  1. the data files are what the build scripts produce from the NASA tables
#  2. every quote is re-found in its source file
#  3. every number in the docs and the deck is one the build computed
#  4. the SI tool agrees with the dashboard, and every saved answer passes the live check
set -e
cd "$(dirname "$0")/.."
echo "== 1/4 rebuild data and compare"
if [ -d data/psi_data ]; then
  python3 -I scripts/build_dataset.py > /dev/null
  python3 -I scripts/build_telemetry.py > /dev/null
  git diff --quiet -- app/data/dataset.js app/data/telemetry.js worker/src/corpus.json \
    && echo "rebuilt files are identical to the committed ones" \
    || { echo "rebuilt files differ from the committed ones"; git diff --stat -- app/data worker/src/corpus.json; exit 1; }
else
  echo "skipped: data/psi_data (the 5.4 GB NASA download) is not on this machine — see README"
fi
echo "== 2/4 quotes";  python3 -I scripts/verify_insights.py
echo "== 3/4 numbers"; python3 -I scripts/check_docs.py
echo "== 4/4 SI";      node worker/test.mjs
echo "all checks passed"
