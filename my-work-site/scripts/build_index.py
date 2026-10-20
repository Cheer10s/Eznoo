#!/usr/bin/env python3
"""Scan files/<section>/ for .pdf and .html files and write pdfs.json for the website.

Run automatically on every deploy (see .github/workflows/deploy.yml).
You can also run it yourself to preview the site: python3 scripts/build_index.py
"""
import datetime
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent


def commit_date(path: Path) -> str:
    """Date the file was last committed; falls back to the file's own date."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", str(path.relative_to(ROOT))],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
        if out:
            return out
    except Exception:
        pass
    return datetime.date.fromtimestamp(path.stat().st_mtime).isoformat()


def nice_title(stem: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[_-]+", " ", stem)).strip() or stem


def main() -> None:
    site = json.loads((ROOT / "site.json").read_text(encoding="utf-8"))
    items = []
    for section in site.get("sections", []):
        slug = section["slug"]
        folder = ROOT / "files" / slug
        if not folder.is_dir():
            print(f"note: no folder files/{slug}")
            continue
        files = [p for p in folder.iterdir() if p.suffix.lower() in (".pdf", ".html")]
        for pdf in sorted(files, key=lambda p: p.name.lower()):
            note = pdf.with_suffix(".txt")
            description = note.read_text(encoding="utf-8").strip() if note.exists() else ""
            items.append({
                "section": slug,
                "title": nice_title(pdf.stem),
                "type": pdf.suffix.lower().lstrip("."),
                "description": description,
                "url": "files/" + quote(slug) + "/" + quote(pdf.name),
                "date": commit_date(pdf),
                "size": pdf.stat().st_size,
            })
    (ROOT / "pdfs.json").write_text(
        json.dumps({"items": items}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"wrote pdfs.json with {len(items)} PDF(s)")


if __name__ == "__main__":
    main()
