"""Packs agent/ into public/downloads/guardian-raid-watch-agent.zip (run after changing the agent)."""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "agent"
OUT = ROOT / "public" / "downloads" / "guardian-raid-watch-agent.zip"
SKIP_DIRS = {".venv", "data", "logs", "__pycache__", ".pytest_cache", ".git"}

OUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for p in sorted(SRC.rglob("*")):
        rel = p.relative_to(SRC)
        if any(part in SKIP_DIRS for part in rel.parts) or p.is_dir() or p.suffix == ".pyc":
            continue
        arc = str(Path("GuardianRaidWatch") / rel)
        if p.suffix == ".bat":  # cmd.exe expects CRLF line endings
            z.writestr(arc, p.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\n", "\r\n"))
        else:
            z.write(p, arc)
print(OUT)
