#!/usr/bin/env python3
"""Build the 8 submission files: core.js + groups/<group>.js -> <out>/<group>.js

    python3 solution/build.py                       # -> solution/dist/
    python3 solution/build.py --out examples/miner_commit/src/commit
"""

import argparse
from pathlib import Path

HERE = Path(__file__).resolve().parent
MAX_LINES, MAX_BYTES = 750, 262_144

ap = argparse.ArgumentParser()
ap.add_argument("--out", nargs="+", default=[str(HERE / "dist")])
args = ap.parse_args()

core = (HERE / "core.js").read_text(encoding="utf-8")
for out in args.out:
    out_dir = Path(out)
    out_dir.mkdir(parents=True, exist_ok=True)
    for group_file in sorted((HERE / "groups").glob("*.js")):
        text = core.rstrip() + "\n\n" + group_file.read_text(encoding="utf-8")
        lines, size = len(text.splitlines()), len(text.encode("utf-8"))
        assert lines <= MAX_LINES and size <= MAX_BYTES, f"{group_file.name}: {lines} lines, {size} bytes"
        (out_dir / group_file.name).write_text(text, encoding="utf-8")
        print(f"{out_dir / group_file.name}: {lines} lines, {size} bytes")
