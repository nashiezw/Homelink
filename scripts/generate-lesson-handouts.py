#!/usr/bin/env python3
"""Generate branded HomeLink lesson handout PDFs from lesson-handouts-manifest.json."""

from __future__ import annotations

import html
import json
import re
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "public" / "uploads" / "academy" / "lesson-handouts-manifest.json"
OUT_DIR = ROOT / "public" / "uploads" / "academy" / "lessons"
LOGO = ROOT / "public" / "brand" / "homelink-full-lockup.png"

GREEN = colors.HexColor("#047857")
INK = colors.HexColor("#0F172A")
MIST = colors.HexColor("#F8FAFC")
LINE = colors.HexColor("#CBD5E1")


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=INK,
            spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#475569"),
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=GREEN,
            spaceBefore=8,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=INK,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=INK,
            leftIndent=8,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7,
            leading=9,
            textColor=colors.HexColor("#64748B"),
            alignment=TA_CENTER,
        ),
    }


def para(text: str, style: ParagraphStyle) -> Paragraph:
    safe = html.escape(text, quote=False)
    safe = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", safe)
    return Paragraph(safe.replace("&amp;", "&"), style)


def html_to_paragraphs(rich_html: str, style: ParagraphStyle) -> list[Paragraph]:
    chunks = re.split(r"</p>\s*|<p[^>]*>", rich_html, flags=re.IGNORECASE)
    paragraphs: list[Paragraph] = []
    for chunk in chunks:
        text = re.sub(r"<br\s*/?>", "\n", chunk, flags=re.IGNORECASE)
        text = re.sub(r"<[^>]+>", "", text)
        text = html.unescape(text).strip()
        if not text:
            continue
        paragraphs.append(para(text, style))
    return paragraphs


def objective_table(objectives: list[str], style: ParagraphStyle) -> Table:
    rows = [["☑", para(objective, style)] for objective in objectives]
    table = Table(rows, colWidths=[8 * mm, 164 * mm], rowHeights=[9 * mm] * len(rows))
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.3, LINE),
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("TEXTCOLOR", (0, 0), (0, -1), GREEN),
            ]
        )
    )
    return table


def header_footer(canvas, doc, title: str):
    canvas.saveState()
    canvas.setFillColor(GREEN)
    canvas.rect(0, 286 * mm, 210 * mm, 11 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(18 * mm, 289.5 * mm, "HomeLink Zimbabwe Agent Academy")
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(
        105 * mm,
        9 * mm,
        f"{title} • Lesson Handout • {date.today().isoformat()} • Page {doc.page}",
    )
    canvas.restoreState()


def make_lesson_handout(item: dict, output: Path):
    s = styles()
    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=16 * mm,
    )
    story: list = []
    if LOGO.exists():
        img = Image(str(LOGO), width=48 * mm, height=14 * mm)
        img.hAlign = "LEFT"
        story.append(img)
    story.append(Spacer(1, 4 * mm))
    story.append(para(item["title"], s["title"]))
    story.append(
        para(
            f"<b>Programme:</b> {item['courseTitle']} &nbsp;&nbsp; "
            f"<b>Module:</b> {item['moduleTitle']} &nbsp;&nbsp; "
            f"<b>Duration:</b> {item['estimatedMinutes']} minutes",
            s["subtitle"],
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(para("Lesson Summary", s["section"]))
    story.append(para(item["summary"], s["body"]))
    story.append(para("Lesson Content", s["section"]))
    story.extend(html_to_paragraphs(item["richText"], s["body"]))
    story.append(para("Learning Objectives", s["section"]))
    story.append(para("After completing this lesson you should be able to:", s["body"]))
    story.append(Spacer(1, 2 * mm))
    story.append(objective_table(item.get("objectives") or [], s["body"]))
    resources = item.get("resourceTitles") or []
    if resources:
        story.append(para("Field Toolkit Downloads", s["section"]))
        story.append(
            para(
                "Use these branded HomeLink print-ready tools when applying this lesson in the field: "
                + ", ".join(resources)
                + ". Download them from the lesson Toolkit tab in your Academy dashboard.",
                s["body"],
            )
        )
    story.append(Spacer(1, 6 * mm))
    story.append(
        para(
            "HomeLink Zimbabwe Agent Academy — confidential training material for enrolled learners. "
            "Apply this guidance professionally and in line with HomeLink standards.",
            s["footer"],
        )
    )
    title = item["title"]
    doc.build(
        story,
        onFirstPage=lambda c, d: header_footer(c, d, title),
        onLaterPages=lambda c, d: header_footer(c, d, title),
    )


def main():
    if not MANIFEST.exists():
        raise SystemExit(f"Manifest not found: {MANIFEST}. Run: npm run academy:export-lesson-handouts")
    items = json.loads(MANIFEST.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    generated = 0
    for item in items:
        output = OUT_DIR / f"{item['slug']}.pdf"
        make_lesson_handout(item, output)
        generated += 1
    print(json.dumps({"generated": generated, "outputDir": str(OUT_DIR)}, indent=2))


if __name__ == "__main__":
    main()
