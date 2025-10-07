#!/usr/bin/env python3
"""Convert markdown posts from OLDPOSTS into HTML fragments and generate metadata."""

import json
import math
import re
import sys
from datetime import datetime
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
SRC_DIR = CURRENT_DIR.parent
ROOT_DIR = SRC_DIR.parent
OLD_POSTS_DIR = SRC_DIR / "OLDPOSTS" / "_posts"
OUTPUT_DIR = SRC_DIR / "content" / "posts"
DATA_FILE = SRC_DIR / "data" / "blogPosts.ts"

PYTHON_LIB = SRC_DIR / "python-lib"
if PYTHON_LIB.exists():
    sys.path.append(str(PYTHON_LIB))

try:
    from markdown import markdown
except ImportError as exc:
    raise SystemExit("Missing markdown module. Run: python3 -m pip install markdown --target ./src/python-lib --no-cache-dir") from exc

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SCRIPT_RE = re.compile(r"<script.*?</script>\s*", re.IGNORECASE | re.DOTALL)
STYLE_RE = re.compile(r"<style.*?</style>\s*", re.IGNORECASE | re.DOTALL)
COMMENT_RE = re.compile(r"<!--.*?-->\s*", re.DOTALL)
FRONT_MATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)
IMG_TOKEN_RE = re.compile(r"\{\{\s*site\.url\s*\}\}/imgs/?")
SIDENOTE_TOKEN_RE = re.compile(r"\^\{sidenote(?:\:([^|}]+))?\|(.*?)\}", re.DOTALL)

PLACEHOLDER_TEMPLATE = "[[SIDENOTE_{index}]]"

AUTHOR = "Paul Garnier"


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower())
    return slug.strip("-")


def clean_markdown(md_text: str) -> tuple[str, dict[str, str]]:
    match = FRONT_MATTER_RE.match(md_text)
    meta: dict[str, str] = {}
    if match:
        fm_text = match.group(1)
        md_text = md_text[match.end():]
        for line in fm_text.splitlines():
            if not line.strip() or ":" not in line:
                continue
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip()
    # remove GA scripts, mathjax configs, inline styles
    md_text = SCRIPT_RE.sub("", md_text)
    md_text = STYLE_RE.sub("", md_text)
    md_text = COMMENT_RE.sub("", md_text)
    # normalize liquid tags
    md_text = IMG_TOKEN_RE.sub("imgs/", md_text)
    md_text = md_text.replace("{{site.url}}/imgs/", "imgs/")
    md_text = md_text.replace("{{ site.url }}", "")
    md_text = md_text.replace("{{ site.baseurl }}", "")
    return md_text.strip(), meta


def extract_sidenotes(md_text: str) -> tuple[str, list[dict[str, str]]]:
    sidenotes: list[dict[str, str]] = []

    def replacer(match: re.Match[str]) -> str:
        display_id = match.group(1).strip() if match.group(1) else ""
        note_md = match.group(2).strip()
        index = len(sidenotes) + 1
        label = display_id or str(index)
        placeholder = PLACEHOLDER_TEMPLATE.format(index=index)
        sidenotes.append({
            "index": index,
            "label": label,
            "markdown": note_md,
        })
        return placeholder

    updated_md = SIDENOTE_TOKEN_RE.sub(replacer, md_text)
    return updated_md, sidenotes


def render_inline_markdown(value: str) -> str:
    html = markdown(
        value,
        extensions=[
            "extra",
            "sane_lists",
        ],
    )
    html = html.strip()
    if html.startswith("<p>") and html.endswith("</p>"):
        html = html[3:-4]
    return html


def extract_text(html: str) -> str:
    text = re.sub(r"<(script|style)[^>]*>.*?</\\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


posts_metadata: list[dict[str, str]] = []

for md_path in sorted(OLD_POSTS_DIR.glob("*.md")):
    md_text = md_path.read_text(encoding="utf-8")
    content_md, meta = clean_markdown(md_text)
    content_md, sidenotes = extract_sidenotes(content_md)

    stem_parts = md_path.stem.split("-")
    if len(stem_parts) < 4:
        raise SystemExit(f"Unexpected file name format: {md_path.name}")
    year, month, day = stem_parts[:3]
    try:
        dt = datetime(int(year), int(month), int(day))
    except ValueError as exc:
        raise SystemExit(f"Invalid date in file name {md_path.name}: {exc}") from exc

    title = meta.get("title", " ".join(stem_parts[3:]))
    slug = slugify(title)

    html = markdown(
        content_md,
        extensions=[
            "extra",
            "sane_lists",
            "toc",
            "tables",
        ],
    )

    # ensure figure captions stay close to images by removing excessive <p><br>
    html = re.sub(r"<p>\s*</p>", "", html)

    for note in sidenotes:
        placeholder = PLACEHOLDER_TEMPLATE.format(index=note["index"])
        note_html = render_inline_markdown(note["markdown"])
        replacement = (
            f'<sup class="sidenote-ref" data-note="{note["index"]}">{note["label"]}</sup>'
            f'<span class="sidenote" data-note="{note["index"]}" role="note">'
            f'<span class="sidenote-number">{note["label"]}</span>{note_html}'
            "</span>"
            f'<span class="sidenote-mobile" data-note="{note["index"]}" role="note">'
            f'<span class="sidenote-number">{note["label"]}</span>{note_html}'
            "</span>"
        )
        html = html.replace(placeholder, replacement)

    text_content = extract_text(html)
    if not text_content:
        excerpt = ""
    else:
        words = text_content.split()
        excerpt_words = words[:50]
        excerpt = " ".join(excerpt_words)
        if len(words) > 50:
            excerpt += "..."

    word_count = len(text_content.split())
    minutes = max(1, math.ceil(word_count / 200))
    read_time = f"{minutes} min read"

    content_filename = f"{slug}.html"
    (OUTPUT_DIR / content_filename).write_text(html, encoding="utf-8")

    friendly_date = dt.strftime("%b %d, %Y").replace(" 0", " ")

    posts_metadata.append(
        {
            "id": dt.strftime("%Y%m%d") + "-" + slug,
            "slug": slug,
            "title": title,
            "author": AUTHOR,
            "date": friendly_date,
            "dateISO": dt.strftime("%Y-%m-%d"),
            "excerpt": excerpt,
            "readTime": read_time,
            "contentFile": content_filename,
        }
    )

# sort newest first
posts_metadata.sort(key=lambda item: item["dateISO"], reverse=True)

# build TypeScript file
header = """export interface BlogPost {\n  id: string;\n  slug: string;\n  title: string;\n  author: string;\n  date: string;\n  dateISO: string;\n  excerpt: string;\n  readTime: string;\n  contentFile: string;\n}\n\nexport const blogPosts: BlogPost[] = [\n"""

lines: list[str] = [header]

for post in posts_metadata:
    lines.append("  {\n")
    for key in ["id", "slug", "title", "author", "date", "dateISO", "excerpt", "readTime", "contentFile"]:
        value = post[key].replace("\\", "\\\\").replace("\"", "\\\"")
        lines.append(f"    {key}: \"{value}\",\n")
    lines.append("  },\n")

lines.append("];\n")

DATA_FILE.write_text("".join(lines), encoding="utf-8")

print(f"Generated {len(posts_metadata)} posts.")
