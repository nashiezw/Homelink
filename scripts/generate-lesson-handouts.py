#!/usr/bin/env python3
"""Generate branded HouseLink lesson notes PDFs from lesson-handouts-manifest.json."""

from __future__ import annotations

import html
import json
import re
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "public" / "uploads" / "academy" / "lesson-handouts-manifest.json"
OUT_DIR = ROOT / "public" / "uploads" / "academy" / "lessons"
LOGO = ROOT / "public" / "brand" / "houselink-full-lockup.png"

GREEN = colors.HexColor("#047857")
EMERALD = colors.HexColor("#10B981")
GOLD = colors.HexColor("#C6A15B")
INK = colors.HexColor("#0F172A")
MIST = colors.HexColor("#F8FAFC")
LINE = colors.HexColor("#CBD5E1")
SLATE = colors.HexColor("#475569")


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.white,
            spaceAfter=4,
        ),
        "heroMeta": ParagraphStyle(
            "HeroMeta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#D1FAE5"),
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=SLATE,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=GREEN,
            spaceBefore=10,
            spaceAfter=5,
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
            leftIndent=6,
        ),
        "calloutTitle": ParagraphStyle(
            "CalloutTitle",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            textColor=GREEN,
        ),
        "calloutBody": ParagraphStyle(
            "CalloutBody",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=INK,
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
    safe = re.sub(r"<strong>(.+?)</strong>", r"<b>\1</b>", safe, flags=re.IGNORECASE)
    return Paragraph(safe.replace("&amp;", "&"), style)


def clean_html(raw: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", raw, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return html.unescape(text).strip()


def html_to_blocks(rich_html: str, style: ParagraphStyle, section_style: ParagraphStyle) -> list:
    chunks = re.split(r"</p>\s*|<p[^>]*>", rich_html, flags=re.IGNORECASE)
    blocks: list = []
    for chunk in chunks:
        text = clean_html(chunk)
        if not text:
            continue
        lines = [line.strip() for line in re.split(r"[\n\r]+", text) if line.strip()]
        bullet_lines = [line for line in lines if line.startswith("•") or line.startswith("-")]
        if len(bullet_lines) >= 2 and len(bullet_lines) == len(lines):
            items = [re.sub(r"^[•\-]\s*", "", line) for line in bullet_lines]
            blocks.append(checklist_table(items, style))
            blocks.append(Spacer(1, 3 * mm))
            continue
        if len(text) < 90 and (text.endswith(":") or text.isupper()):
            blocks.append(para(text, section_style))
            continue
        blocks.append(para(text, style))
        blocks.append(Spacer(1, 2.5 * mm))
    return blocks


def hero_banner(title: str, course_title: str, module_title: str, minutes: int, s: dict) -> Table:
    meta = f"Programme: {course_title} | Module: {module_title} | Study time: {minutes} min"
    rows = [
        [para(title, s["title"])],
        [para(meta, s["heroMeta"])],
    ]
    table = Table(rows, colWidths=[174 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), GREEN),
                ("BOX", (0, 0), (-1, -1), 0, GREEN),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, -1), (-1, -1), 10),
            ]
        )
    )
    return table


def overview_box(summary: str, style: ParagraphStyle) -> Table:
    table = Table([[para(summary, style)]], colWidths=[174 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), MIST),
                ("BOX", (0, 0), (-1, -1), 0.6, EMERALD),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def checklist_table(items: list[str], style: ParagraphStyle) -> Table:
    rows = [["☑", para(item, style)] for item in items]
    table = Table(rows, colWidths=[8 * mm, 166 * mm], rowHeights=[9 * mm] * len(rows))
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.3, LINE),
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, MIST]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("TEXTCOLOR", (0, 0), (0, -1), GREEN),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def objectives_table(objectives: list[str], style: ParagraphStyle) -> Table:
    rows = [[para("Learning objective", style), para("Self-check", style)]]
    for objective in objectives:
        rows.append([para(objective, style), "☐ Confident ☐ Practising ☐ Review"])
    table = Table(rows, colWidths=[124 * mm, 50 * mm], rowHeights=[8 * mm] + [10 * mm] * len(objectives), repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, MIST]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("FONTSIZE", (1, 1), (1, -1), 7),
                ("TEXTCOLOR", (1, 1), (1, -1), SLATE),
            ]
        )
    )
    return table


def callout_box(title: str, body: str, s: dict, accent: colors.Color = GOLD) -> Table:
    rows = [[para(title, s["calloutTitle"])], [para(body, s["calloutBody"])]]
    table = Table(rows, colWidths=[174 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFFBEB")),
                ("BOX", (0, 0), (-1, -1), 0.8, accent),
                ("LINEBEFORE", (0, 0), (0, -1), 3, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def reflection_questions(title: str, objectives: list[str]) -> list[str]:
    focus = objectives[0] if objectives else title
    return [
        f"How will you apply “{focus}” in your next client conversation or property visit?",
        f"What is one habit you will change this week based on “{title}”?",
        "Which part of this lesson needs more practice before you move on — and how will you get it?",
    ]


def professional_tip(title: str) -> str:
    tips = {
        "ethics": "Clients remember how you made them feel. Honest guidance today builds referrals tomorrow.",
        "listing": "A complete listing file before marketing saves rework, protects compliance, and speeds up enquiries.",
        "viewing": "Log every viewing immediately — memory fades, but your register becomes your competitive edge.",
        "document": "Incomplete documents delay deals. Check twice, file once, and keep clients informed.",
        "prospect": "Prospecting is a daily discipline, not a mood. Block time every morning before reactive work fills your diary.",
    }
    lowered = title.lower()
    for key, tip in tips.items():
        if key in lowered:
            return tip
    return (
        "The best HouseLink agents translate training into consistent field habits. "
        "Read this note, use the linked forms, then practise one action before your next lesson."
    )


def header_footer(canvas, doc, title: str):
    canvas.saveState()
    canvas.setFillColor(GREEN)
    canvas.rect(0, 286 * mm, 210 * mm, 11 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(18 * mm, 289.5 * mm, "HouseLink Zimbabwe Agent Academy")
    canvas.setFillColor(EMERALD)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawRightString(192 * mm, 289.5 * mm, "Lesson Notes")
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(
        105 * mm,
        9 * mm,
        f"{title} • Lesson Notes PDF • {date.today().isoformat()} • Page {doc.page}",
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
        img = Image(str(LOGO), width=52 * mm, height=15 * mm)
        img.hAlign = "LEFT"
        story.append(img)
    story.append(Spacer(1, 4 * mm))
    story.append(hero_banner(item["title"], item["courseTitle"], item["moduleTitle"], item["estimatedMinutes"], s))
    story.append(Spacer(1, 5 * mm))

    story.append(para("Lesson Overview", s["section"]))
    story.append(overview_box(item["summary"], s["body"]))
    story.append(Spacer(1, 4 * mm))

    objectives = item.get("objectives") or []
    if objectives:
        story.append(para("Key Takeaways", s["section"]))
        story.append(checklist_table(objectives, s["body"]))
        story.append(Spacer(1, 4 * mm))

    story.append(para("Learning Objectives", s["section"]))
    story.append(para("Use this checklist to confirm you can apply this lesson professionally:", s["subtitle"]))
    story.append(Spacer(1, 2 * mm))
    story.append(objectives_table(objectives or ["Apply this lesson in daily field work"], s["body"]))
    story.append(PageBreak())

    story.append(para("Lesson Guide", s["section"]))
    story.append(para(f"In-depth notes for {item['title']} - study, annotate, and revisit before client meetings.", s["subtitle"]))
    story.append(Spacer(1, 3 * mm))
    story.extend(html_to_blocks(item["richText"], s["body"], s["section"]))

    story.append(Spacer(1, 4 * mm))
    story.append(para("Apply in the Field", s["section"]))
    apply_steps = objectives[:4] if objectives else [
        "Review this lesson note before your next client interaction.",
        "Download and complete the linked HouseLink forms from the Toolkit tab.",
        "Discuss any gaps with your mentor or branch lead.",
    ]
    story.append(checklist_table([f"Practise: {step}" for step in apply_steps], s["body"]))
    story.append(Spacer(1, 4 * mm))

    story.append(para("Reflection Questions", s["section"]))
    for index, question in enumerate(reflection_questions(item["title"], objectives), start=1):
        story.append(para(f"{index}. {question}", s["body"]))
        story.append(Spacer(1, 1.5 * mm))

    story.append(Spacer(1, 4 * mm))
    story.append(callout_box("Professional Tip", professional_tip(item["title"]), s))

    resources = item.get("resourceTitles") or []
    if resources:
        story.append(Spacer(1, 4 * mm))
        story.append(para("Related Field Toolkit", s["section"]))
        story.append(
            para(
                "These branded HouseLink forms support this lesson - download them from the Toolkit tab in your course:",
                s["body"],
            )
        )
        story.append(Spacer(1, 2 * mm))
        story.append(checklist_table(resources, s["body"]))

    story.append(Spacer(1, 6 * mm))
    story.append(
        para(
            "HouseLink Zimbabwe Agent Academy — confidential lesson notes for enrolled learners. "
            "Apply this guidance professionally and in line with HouseLink standards.",
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
