#!/usr/bin/env python3
"""Extract HomeLink Agent Training Manual into LMS course JSON."""

from __future__ import annotations

import json
import re
import html
from pathlib import Path

import pypdf

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF = Path(r"D:\New folder\Desktop\Real Estate Business\REAL ESTATE AGENT TRAINING MANUAL.pdf")
FALLBACK_PDF = ROOT / "public" / "uploads" / "academy" / "homelink-zimbabwe-real-estate-agent-training-manual.pdf"
OUT_PATH = ROOT / "lib" / "academy" / "data" / "homelink-agent-course.json"

SKIP_TITLES = {
    "contents", "disclaimer", "professional standards", "publisher", "page",
    "learning objectives", "key takeaways", "practical exercise", "professional tip",
    "practical example", "chapter summary", "knowledge check", "multiple choice",
    "short answer questions", "practical assignment", "reflection questions",
    "chapter completion checklist", "table of contents",
}

MODULE_PATTERNS = [
    re.compile(r"^INTRODUCTION\s*$", re.I),
    re.compile(r"^CHAPTER\s+(\d+)\s*$", re.I),
    re.compile(r"^CHAPTER\s+(\d+)\s*[:\-–—]\s*(.+)$", re.I),
    re.compile(r"^APPENDIX\s+(.+)$", re.I),
    re.compile(r"^PROFESSIONAL\s+AGENT\s+RESOURCE\s+KIT\s*$", re.I),
]

TOC_LINE = re.compile(r"^(.+?)\s+\.{2,}\s+(\d+)\s*$")


def normalize_title(value: str) -> str:
    value = re.sub(r"\s+", " ", value.strip())
    value = re.sub(r"\.{2,}.*$", "", value).strip()
    return value


def is_skip(title: str) -> bool:
    t = title.lower().strip()
    if not t or len(t) < 4:
        return True
    if t.startswith("page "):
        return True
    if re.fullmatch(r"chapter \d+", t):
        return True
    return t in SKIP_TITLES


def detect_module(title: str) -> str | None:
    for pattern in MODULE_PATTERNS:
        m = pattern.match(title.strip())
        if m:
            if m.lastindex and m.lastindex >= 2:
                return f"Chapter {m.group(1)}: {m.group(2).strip()}"
            if m.lastindex == 1 and m.group(1).isdigit():
                return f"Chapter {m.group(1)}"
            return title.strip()
    upper = title.upper()
    if upper.startswith("FOUNDATIONS OF REAL ESTATE"):
        return "Chapter 1: Foundations of Real Estate"
    if "PROSPECTING" in upper and "MARKETING" in upper:
        return "Chapter 2: Prospecting, Listings and Property Marketing"
    if "WORKING WITH CLIENTS" in upper:
        return "Chapter 3: Working with Clients"
    if "DOCUMENTATION" in upper or "COMPLIANCE" in upper:
        return "Chapter 4: Documentation, Legal Awareness and Compliance"
    if "TOP-PERFORMING" in upper or "TOP PERFORMING" in upper:
        return "Chapter 5: Becoming a Top-Performing Agent"
    return None


def parse_toc(reader: pypdf.PdfReader) -> list[dict]:
    entries: list[dict] = []
    for page_index in range(min(25, len(reader.pages))):
        text = reader.pages[page_index].extract_text() or ""
        for raw_line in text.split("\n"):
            line = raw_line.strip()
            m = TOC_LINE.match(line)
            if not m:
                continue
            title = normalize_title(m.group(1))
            page_num = int(m.group(2))
            if is_skip(title):
                continue
            entries.append({"title": title, "page": page_num})
    return entries


def build_structure(entries: list[dict]) -> list[dict]:
    modules: list[dict] = []
    current: dict | None = None

    for entry in entries:
        title = entry["title"]
        module_title = detect_module(title)
        if module_title:
            current = {
                "title": module_title,
                "description": f"Official HomeLink Zimbabwe training module: {module_title}.",
                "objectives": [],
                "lessons": [],
            }
            modules.append(current)
            if not is_skip(title) and title.lower() not in {m.lower() for m in [
                "introduction", "chapter 1", "chapter 2", "chapter 3", "chapter 4", "chapter 5"
            ]} and not title.lower().startswith("chapter "):
                pass
            continue
        if current is None:
            current = {
                "title": "Introduction to the HomeLink Zimbabwe Standard",
                "description": "Welcome, orientation and professional standards for HomeLink agents.",
                "objectives": [],
                "lessons": [],
            }
            modules.append(current)
        current["lessons"].append({"title": title, "startPage": entry["page"]})
    return modules


def page_text(reader: pypdf.PdfReader, page_num: int) -> str:
    idx = max(0, min(len(reader.pages) - 1, page_num - 1))
    return (reader.pages[idx].extract_text() or "").strip()


def extract_lesson_content(reader: pypdf.PdfReader, start_page: int, end_page: int) -> dict:
    chunks: list[str] = []
    objectives: list[str] = []
    checklist: list[str] = []
    reflections: list[str] = []
    discussion = ""
    notes: list[str] = []

    for p in range(start_page, end_page + 1):
        text = page_text(reader, p)
        if not text:
            continue
        lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
        filtered = []
        for ln in lines:
            if re.match(r"^Page \d+ of \d+$", ln):
                continue
            filtered.append(ln)
        body = "\n".join(filtered)
        chunks.append(body)

        capture = None
        for ln in filtered:
            low = ln.lower()
            if low.startswith("learning objectives"):
                capture = "objectives"
                continue
            if low.startswith("key takeaways"):
                capture = None
            if low.startswith("reflection questions"):
                capture = "reflections"
                continue
            if low.startswith("chapter completion checklist"):
                capture = "checklist"
                continue
            if low.startswith("discussion"):
                capture = "discussion"
                continue
            if low.startswith("professional tip"):
                capture = "notes"
                continue
            if capture == "objectives" and len(ln) > 8 and not ln.endswith(":"):
                objectives.append(ln.lstrip("•- ").strip())
            elif capture == "checklist" and (ln.startswith("☐") or ln.startswith("□") or ln.startswith("-")):
                checklist.append(ln.lstrip("☐□- ").strip())
            elif capture == "reflections" and len(ln) > 10:
                reflections.append(ln.lstrip("•- ").strip())
            elif capture == "discussion" and len(ln) > 15:
                discussion = ln
            elif capture == "notes" and len(ln) > 10:
                notes.append(ln)

    plain = "\n\n".join(chunks)
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", plain) if len(p.strip()) > 40]
    html_parts = []
    for para in paragraphs[:40]:
        if para.lower().startswith("learning objectives"):
            continue
        html_parts.append(f"<p>{html.escape(para.replace(chr(10), ' '))}</p>")

    rich = "\n".join(html_parts) if html_parts else f"<p>{html.escape(plain[:4000])}</p>"
    summary = paragraphs[0][:280] + ("..." if len(paragraphs[0]) > 280 else "") if paragraphs else "Official HomeLink training lesson content."

    return {
        "summary": summary,
        "richText": rich,
        "transcript": plain[:12000],
        "lessonNotes": "\n".join(notes) if notes else None,
        "objectives": objectives[:8],
        "checklist": checklist[:12] or None,
        "reflectionQuestions": reflections[:6] or None,
        "discussionPrompt": discussion or None,
        "estimatedMinutes": max(15, min(90, len(paragraphs) * 3)),
    }


def enrich_modules(reader: pypdf.PdfReader, modules: list[dict]) -> list[dict]:
    lesson_pages: list[int] = []
    for module in modules:
        for lesson in module["lessons"]:
            lesson_pages.append(lesson["startPage"])
    lesson_pages = sorted(set(lesson_pages))

    page_to_end: dict[int, int] = {}
    for i, start in enumerate(lesson_pages):
        page_to_end[start] = (lesson_pages[i + 1] - 1) if i + 1 < len(lesson_pages) else len(reader.pages)

    enriched = []
    for module in modules:
        lessons = []
        for lesson in module["lessons"]:
            start = lesson["startPage"]
            end = max(start, page_to_end.get(start, start + 2))
            content = extract_lesson_content(reader, start, end)
            lessons.append({
                "title": lesson["title"],
                "startPage": start,
                **content,
                "resources": [
                    {"title": "Official Training Manual (PDF)", "body": "Download the complete HomeLink Zimbabwe Real Estate Agent Training Manual.", "type": "PDF"},
                ],
                "downloads": [
                    {"title": "HomeLink Agent Training Manual", "url": "/uploads/academy/homelink-zimbabwe-real-estate-agent-training-manual.pdf", "type": "PDF"},
                ],
            })
        if lessons:
            module["objectives"] = [f"Complete all lessons in {module['title']}", "Apply manual guidance in daily practice", "Pass module knowledge checks"]
            module["estimatedMinutes"] = sum(l["estimatedMinutes"] for l in lessons)
            module["lessons"] = lessons
            enriched.append(module)
    return enriched


def main() -> None:
    pdf_path = DEFAULT_PDF if DEFAULT_PDF.exists() else FALLBACK_PDF
    if not pdf_path.exists():
        raise SystemExit(f"Manual PDF not found at {DEFAULT_PDF} or {FALLBACK_PDF}")

    reader = pypdf.PdfReader(str(pdf_path))
    entries = parse_toc(reader)
    modules = build_structure(entries)
    modules = enrich_modules(reader, modules)

    total_lessons = sum(len(m["lessons"]) for m in modules)
    payload = {
        "course": {
            "id": "academy-course-official-real-estate-agent-training",
            "title": "HomeLink Zimbabwe Real Estate Agent Training",
            "subtitle": "Complete Professional Certification Programme",
            "slug": "homelink-zimbabwe-real-estate-agent-training",
            "shortDescription": "Production-ready agent training aligned to the official HomeLink Zimbabwe Real Estate Agent Training Manual.",
            "description": "The definitive HomeLink Zimbabwe certification programme covering foundations, prospecting, client service, compliance, performance excellence and the complete professional resource kit.",
            "instructor": "HomeLink Zimbabwe Academy",
            "coInstructors": ["HomeLink Training Team"],
            "learningOutcomes": [
                "Apply HomeLink professional standards in every client interaction",
                "Execute prospecting, listings and marketing workflows",
                "Qualify buyers and tenants and manage viewings professionally",
                "Complete documentation and compliance files accurately",
                "Build a sustainable high-performance real estate career",
            ],
            "targetAudience": "New and existing HomeLink agents, public learners pursuing professional property training",
            "estimatedHours": 40,
            "language": "English",
            "tags": ["real estate", "zimbabwe", "agent training", "homelink", "certification"],
        },
        "modules": modules,
        "meta": {"sourcePdf": str(pdf_path), "pageCount": len(reader.pages), "lessonCount": total_lessons, "moduleCount": len(modules)},
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUT_PATH} — {len(modules)} modules, {total_lessons} lessons, {len(reader.pages)} PDF pages")


if __name__ == "__main__":
    main()
