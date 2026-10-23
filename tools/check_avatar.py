#!/usr/bin/env python3
"""Run local avatar checks without camera access or paid image-generation calls."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
UNIT = ["avatar_model", "avatar_tracking", "avatar_app", "avatar_mesh", "avatar_kalido",
        "avatar_response", "selfie_library", "portrait_rig", "portrait_motion", "portrait_deformation"]
BROWSER = ["portrait_quality", "portrait_browser", "portrait_cache", "portrait_workbench", "avatar_browser", "selfie_browser"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser", action="store_true", help="also run real WebGL/IndexedDB checks (requires Playwright)")
    parser.add_argument("--browser-path", help="path to a local Chrome/Chromium executable")
    args = parser.parse_args()
    node = shutil.which("node")
    if not node:
        parser.error("Node.js is required. Install Node.js, then open a new terminal.")
    env = {**os.environ, "PYTHON": sys.executable, "AVATAR_PYTHON": sys.executable, "PYTHONIOENCODING": "utf-8"}
    if args.browser_path:
        env.update(CHROME_PATH=args.browser_path, AVATAR_BROWSER_PATH=args.browser_path)
    commands = [[node, "tests/" + name + ".test.js"] for name in UNIT]
    commands += [[sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_*server.py"]]
    if args.browser:
        probe = subprocess.run([node, "-e", "require('playwright')"], cwd=ROOT, env=env, capture_output=True)
        if probe.returncode:
            parser.error("Browser checks require Playwright in your development environment. Basic checks work without --browser.")
        for name in BROWSER:
            filename = name + (".test.js" if name.endswith("browser") else "_browser.test.js")
            commands.append([node, "tests/" + filename])
    for index, command in enumerate(commands, 1):
        print("[%d/%d] %s" % (index, len(commands), " ".join(command[1:])), flush=True)
        try:
            result = subprocess.run(command, cwd=ROOT, env=env, timeout=180)
        except subprocess.TimeoutExpired:
            print("FAIL: check timed out", file=sys.stderr)
            return 1
        if result.returncode:
            return result.returncode
    print("PASS: all requested checks completed. Camera/model quality still needs a local camera trial.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
