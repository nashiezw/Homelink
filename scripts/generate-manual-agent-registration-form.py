from __future__ import annotations

import json
from datetime import date
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "uploads" / "academy"
RESOURCE_DIR = OUT_DIR / "resources"
MANIFEST = OUT_DIR / "academy-resources-manifest.json"
LOGO = ROOT / "public" / "brand" / "homelink-full-lockup.png"
OUTPUT = RESOURCE_DIR / "manual-agent-registration-form.pdf"
FILE_URL = "/uploads/academy/resources/manual-agent-registration-form.pdf"

GREEN = colors.HexColor("#047857")
EMERALD = colors.HexColor("#10B981")
OCEAN = colors.HexColor("#155E75")
INK = colors.HexColor("#102024")
MIST = colors.HexColor("#F8FAFC")
SAND = colors.HexColor("#F8F5EF")
LINE = colors.HexColor("#CBD5E1")
SLATE = colors.HexColor("#475569")
AMBER = colors.HexColor("#C6A15B")


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=INK,
            spaceAfter=7,
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
            spaceBefore=9,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=INK,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.2,
            leading=9,
            textColor=SLATE,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7,
            leading=9,
            textColor=SLATE,
            alignment=TA_CENTER,
        ),
        "white": ParagraphStyle(
            "White",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10,
            textColor=colors.white,
        ),
    }


def para(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text), style)


def header_footer(canvas, doc, title: str):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(INK)
    canvas.rect(0, height - 14 * mm, width, 14 * mm, fill=1, stroke=0)
    canvas.setFillColor(GREEN)
    canvas.rect(0, height - 14 * mm, width, 3 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(18 * mm, height - 9.5 * mm, "HomeLink Zimbabwe Agent Recruitment")
    canvas.setFillColor(SLATE)
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(
        width / 2,
        9 * mm,
        f"{title} - Version 1.0 - Generated {date.today().isoformat()} - Page {doc.page}",
    )
    canvas.restoreState()


def field_table(fields: list[str], row_height: float = 9.5 * mm) -> Table:
    s = styles()
    rows = [[para("Field", s["white"]), para("Details", s["white"])]]
    for field in fields:
        rows.append([para(field, s["body"]), ""])
    table = Table(rows, colWidths=[58 * mm, 114 * mm], rowHeights=[8 * mm] + [row_height] * len(fields), repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                ("GRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, MIST]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def checklist(items: list[str], columns: int = 2) -> Table:
    s = styles()
    rows = []
    for i in range(0, len(items), columns):
        chunk = items[i : i + columns]
        row = []
        for item in chunk:
            row.extend(["[ ]", para(item, s["body"])])
        while len(row) < columns * 2:
            row.extend(["", ""])
        rows.append(row)
    col_widths = []
    for _ in range(columns):
        col_widths.extend([9 * mm, (172 / columns - 9) * mm])
    table = Table(rows, colWidths=col_widths, rowHeights=[8 * mm] * len(rows))
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.3, LINE),
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("ALIGN", (1, 0), (1, -1), "LEFT"),
                ("ALIGN", (3, 0), (3, -1), "LEFT"),
                ("TEXTCOLOR", (0, 0), (-1, -1), GREEN),
            ]
        )
    )
    return table


def scoring_table() -> Table:
    s = styles()
    rows = [[para("Assessment Area", s["white"]), para("Score / 5", s["white"]), para("Notes", s["white"])]]
    areas = [
        "Professional presentation and communication",
        "Sales mindset and client-service attitude",
        "Local area/property-market knowledge",
        "Documentation discipline and compliance awareness",
        "Digital readiness: phone, WhatsApp, email, platform use",
        "Availability, transport and territory fit",
    ]
    for area in areas:
        rows.append([para(area, s["body"]), "", ""])
    rows.append([para("Total score", s["body"]), "", ""])
    table = Table(rows, colWidths=[78 * mm, 26 * mm, 68 * mm], rowHeights=[8 * mm] + [9 * mm] * len(areas) + [9 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), OCEAN),
                ("GRID", (0, 0), (-1, -1), 0.35, LINE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, MIST]),
                ("BACKGROUND", (0, -1), (-1, -1), SAND),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def signature_table() -> Table:
    s = styles()
    rows = [
        [para("Applicant declaration", s["white"]), para("Office approval", s["white"])],
        [
            para(
                "I confirm that the information supplied is true and complete. I understand that HomeLink may verify my identity, references, qualifications and suitability before onboarding.",
                s["small"],
            ),
            para(
                "Recruitment decision must be completed by an authorised HomeLink manager before the applicant may represent HomeLink or receive leads.",
                s["small"],
            ),
        ],
        [para("Applicant signature / date", s["body"]), para("Manager signature / date", s["body"])],
        ["", ""],
    ]
    table = Table(rows, colWidths=[86 * mm, 86 * mm], rowHeights=[8 * mm, 18 * mm, 8 * mm, 14 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                ("GRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def hero_block() -> Table:
    s = styles()
    left = []
    if LOGO.exists():
        logo = Image(str(LOGO), width=50 * mm, height=14.5 * mm)
        logo.hAlign = "LEFT"
        left.append(logo)
        left.append(Spacer(1, 5 * mm))
    left.extend(
        [
            para("Manual Agent Registration Form", s["title"]),
            para(
                "Office recruitment form for screening, approving and onboarding prospective HomeLink agents.",
                s["subtitle"],
            ),
        ]
    )
    right = [
        para("OFFICE USE", s["section"]),
        para("Application Ref:", s["body"]),
        para("Branch / Office:", s["body"]),
        para("Recruiting Officer:", s["body"]),
        para("Date Received:", s["body"]),
    ]
    table = Table([[left, right]], colWidths=[115 * mm, 57 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), colors.white),
                ("BACKGROUND", (1, 0), (1, 0), MIST),
                ("BOX", (0, 0), (-1, -1), 0.7, GREEN),
                ("LINEBEFORE", (1, 0), (1, 0), 0.7, GREEN),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    return table


def build_pdf():
    RESOURCE_DIR.mkdir(parents=True, exist_ok=True)
    s = styles()
    title = "Manual Agent Registration Form"
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=16 * mm,
    )
    story = [
        hero_block(),
        Spacer(1, 5 * mm),
        para("Applicant Details", s["section"]),
        field_table(
            [
                "Full legal name",
                "National ID / Passport number",
                "Date of birth",
                "Mobile / WhatsApp number",
                "Email address",
                "Residential address",
                "Emergency contact name and number",
                "Current occupation / employer",
            ]
        ),
        para("Recruitment Source and Territory", s["section"]),
        field_table(
            [
                "How did the applicant hear about HomeLink?",
                "Referred by / recruiter name",
                "Preferred city / branch",
                "Preferred suburbs or service areas",
                "Languages spoken",
                "Availability: full-time / part-time / weekends",
                "Transport access: own car / public transport / other",
            ]
        ),
        PageBreak(),
        para("Experience, Tools and Readiness", s["section"]),
        field_table(
            [
                "Real estate, sales or customer-service experience",
                "Education / qualifications / professional certificates",
                "Smartphone, laptop and internet access",
                "Social media / digital marketing capability",
                "Key strengths for agent work",
                "Training needs identified",
            ],
            row_height=10 * mm,
        ),
        para("Required Documents Checklist", s["section"]),
        checklist(
            [
                "Copy of National ID / Passport",
                "Proof of residence",
                "Updated CV / profile",
                "Passport-size photo",
                "Police clearance / affidavit if required",
                "Academic or training certificates",
                "Driver's licence copy if applicable",
                "Bank details for approved agent file",
                "Signed code of conduct",
                "Signed confidentiality undertaking",
            ]
        ),
        para("Interview and Suitability Assessment", s["section"]),
        scoring_table(),
        para("Onboarding Decision", s["section"]),
        field_table(
            [
                "Decision: approved / pending / declined",
                "Approved role or level",
                "Assigned branch / team leader",
                "Commission or incentive notes",
                "Training course assigned",
                "Start date / induction date",
                "Admin notes",
            ],
            row_height=9 * mm,
        ),
        Spacer(1, 4 * mm),
        signature_table(),
        Spacer(1, 4 * mm),
        para(
            "Confidentiality Notice: This form is for authorised HomeLink Zimbabwe recruitment and onboarding use only. Store completed forms securely in the official agent file.",
            s["footer"],
        ),
    ]
    doc.build(story, onFirstPage=lambda c, d: header_footer(c, d, title), onLaterPages=lambda c, d: header_footer(c, d, title))


def update_manifest():
    if not MANIFEST.exists():
        return
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    row = {
        "title": "Manual Agent Registration Form",
        "description": "Branded A4 office-use form for recruiting, screening and onboarding prospective HomeLink agents.",
        "category": "Agent Templates",
        "sourceCategory": "Recruitment",
        "fileName": OUTPUT.name,
        "fileUrl": FILE_URL,
        "fileType": "PDF",
        "tags": ["recruitment", "agent onboarding", "agent academy", "print-ready", "office use"],
        "sortOrder": 51,
        "version": 1,
        "fileSizeBytes": OUTPUT.stat().st_size,
        "manualPage": None,
    }
    manifest = [item for item in manifest if item.get("fileUrl") != FILE_URL and item.get("title") != row["title"]]
    manifest.append(row)
    manifest.sort(key=lambda item: item.get("sortOrder") if item.get("sortOrder") is not None else 9999)
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def main():
    build_pdf()
    update_manifest()
    print(json.dumps({"pdf": str(OUTPUT), "url": FILE_URL, "bytes": OUTPUT.stat().st_size}, indent=2))


if __name__ == "__main__":
    main()
