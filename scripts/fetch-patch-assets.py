"""Fetch CC0 models from Patch's asset library for the explorer game (AGENTS.md section 14).

    python scripts/fetch-patch-assets.py <out dir> <asset id> [<asset id> ...]
    python scripts/fetch-patch-assets.py public/dungeon-explorer/assets/models/market polyhaven:kite_shield

Takes each asset's `preview` variant (512 px textures, meshopt: about a tenth of the full file),
refuses anything that is not CC0-1.0 or is AI-generated, checks the sha256, and prints the credit
lines to append to public/dungeon-explorer/CREDITS.md. Ids without a source get "polyhaven:".
Needs `pch` on the PATH (no login).
"""

import hashlib
import json
import os
import subprocess
import sys
import urllib.request


def main() -> None:
    # Creators' names are not all ASCII (the Windows console is not UTF-8 by default).
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    rel = out.replace("\\", "/").split("public/dungeon-explorer/")[-1]
    credits = []
    for raw in sys.argv[2:]:
        aid = raw if ":" in raw else f"polyhaven:{raw}"
        view = subprocess.run(["pch", "assets", "view", aid, "--json"], capture_output=True, text=True, encoding="utf-8", shell=os.name == "nt")
        a = json.loads(view.stdout)
        if a["license"]["spdx"] != "CC0-1.0" or a.get("ai"):
            sys.exit(f"{aid}: {a['license']['spdx']}, ai={a.get('ai')}; only CC0-1.0 and no AI (AGENTS.md section 14)")
        v = next(v for v in a["variants"] if v["name"] == "preview")
        f = v["files"][0]
        data = urllib.request.urlopen(urllib.request.Request(f["url"], headers={"User-Agent": "Mozilla/5.0"})).read()
        if hashlib.sha256(data).hexdigest() != f["sha256"]:
            sys.exit(f"{aid}: checksum mismatch")
        name = aid.split(":", 1)[1].replace("/", "_")
        with open(os.path.join(out, f"{name}.glb"), "wb") as fh:
            fh.write(data)
        by = ", ".join(a.get("creators") or [])
        credits.append(
            f'"{a["title"]}" by {by} ({a["source"]["name"]}, {a["source"]["url"]}), licensed CC0 1.0 Universal '
            f"(https://creativecommons.org/publicdomain/zero/1.0/). Changed by Patch: preview variant (512 px textures, "
            f"meshopt), pivot at the bottom centre. File: {rel}/{name}.glb"
        )
        print(f"{aid} -> {name}.glb ({len(data) / 1e6:.2f} MB)", file=sys.stderr)
    print("\n\n".join(credits))


if __name__ == "__main__":
    main()
