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
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "uploads" / "academy"
RESOURCE_DIR = OUT_DIR / "resources"
MANIFEST = OUT_DIR / "academy-resources-manifest.json"
LOGO = ROOT / "public" / "brand" / "houselink-full-lockup.png"
OUTPUT = RESOURCE_DIR / "tenant-rental-request-form.pdf"
FILE_URL = "/uploads/academy/resources/tenant-rental-request-form.pdf"

GREEN = colors.HexColor("#047857")
OCEAN = colors.HexColor("#155E75")
INK = colors.HexColor("#102024")
MIST = colors.HexColor("#F8FAFC")
SAND = colors.HexColor("#F8F5EF")
LINE = colors.HexColor("#CBD5E1")
SLATE = colors.HexColor("#475569")


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=21,
            leading=25,
            textColor=INK,
            spaceAfter=6,
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
            spaceBefore=8,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.3,
            leading=10.5,
            textColor=INK,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7,
            leading=9,
            textColor=SLATE,
        ),
        "white": ParagraphStyle(
            "White",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10,
            textColor=colors.white,
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
    }


def para(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text), style)


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(INK)
    canvas.rect(0, height - 14 * mm, width, 14 * mm, fill=1, stroke=0)
    canvas.setFillColor(GREEN)
    canvas.rect(0, height - 14 * mm, width, 3 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(18 * mm, height - 9.5 * mm, "HouseLink Zimbabwe Tenant Requirements")
    canvas.setFillColor(SLATE)
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(
        width / 2,
        9 * mm,
        f"Tenant Rental Request Form - Version 1.0 - Generated {date.today().isoformat()} - Page {doc.page}",
    )
    canvas.restoreState()


def hero_block() -> Table:
    s = styles()
    left = []
    if LOGO.exists():
        logo = Image(str(LOGO), width=50 * mm, height=14.5 * mm)
        logo.hAlign = "LEFT"
        left.append(logo)
        left.append(Spacer(1, 4 * mm))
    left.extend(
        [
            para("Tenant Rental Request Form", s["title"]),
            para(
                "For clients looking for a house, cottage, flat, room or shared accommodation. Complete and send back to HouseLink on WhatsApp or email.",
                s["subtitle"],
            ),
        ]
    )
    right = [
        para("OFFICE USE", s["section"]),
        para("Client Ref:", s["body"]),
        para("Assigned Agent:", s["body"]),
        para("Date Received:", s["body"]),
        para("Lead Source:", s["body"]),
    ]
    table = Table([[left, right]], colWidths=[113 * mm, 59 * mm])
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
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def field_table(fields: list[str], row_height: float = 8.4 * mm) -> Table:
    s = styles()
    rows = [[para("Field", s["white"]), para("Client Details", s["white"])]]
    for field in fields:
        rows.append([para(field, s["body"]), ""])
    table = Table(rows, colWidths=[62 * mm, 110 * mm], rowHeights=[7.5 * mm] + [row_height] * len(fields), repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                ("GRID", (0, 0), (-1, -1), 0.32, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, MIST]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
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
    table = Table(rows, colWidths=col_widths, rowHeights=[7.5 * mm] * len(rows))
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


def note_box(title: str, body: str) -> Table:
    s = styles()
    table = Table(
        [[para(title, s["white"])], [para(body, s["small"])]],
        colWidths=[172 * mm],
        rowHeights=[7.5 * mm, 13 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), OCEAN),
                ("BACKGROUND", (0, 1), (0, 1), SAND),
                ("BOX", (0, 0), (-1, -1), 0.35, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return table


def build_pdf():
    RESOURCE_DIR.mkdir(parents=True, exist_ok=True)
    s = styles()
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
        Spacer(1, 4 * mm),
        para("Client Contact Details", s["section"]),
        field_table(
            [
                "Full name",
                "Mobile / WhatsApp number",
                "Alternative contact number",
                "Email address",
                "Current area / suburb",
            ],
        ),
        para("Property Required", s["section"]),
        field_table(
            [
                "Looking for: house / cottage / flat / room / room-share / other",
                "Bedrooms required",
                "Bathrooms required",
                "Must have ensuite? yes / no / preferred",
                "Preferred suburbs or areas",
                "Second-choice areas",
                "Maximum monthly budget",
                "Preferred move-in date",
            ],
            row_height=8.2 * mm,
        ),
        para("Must-Have Features", s["section"]),
        checklist(
            [
                "Ensuite",
                "Walled and gated",
                "Borehole / backup water",
                "Solar / backup power",
                "Parking",
                "Pet friendly",
                "Close to transport",
                "Close to schools",
                "Fitted kitchen",
                "Staff quarters",
                "Shared allowed",
                "Family friendly",
            ]
        ),
        para("Budget and Readiness", s["section"]),
        field_table(
            [
                "Rent range: minimum to maximum",
                "Deposit available: yes / no / date available",
                "Lease length wanted: 3 / 6 / 12 months / other",
                "Number of adults and children",
                "Employment / income source",
                "Viewing availability: days and times",
            ],
            row_height=8.3 * mm,
        ),
        para("Additional Notes", s["section"]),
        field_table(
            [
                "Important requirements not listed above",
                "Example request: 3-bedroom house with ensuite around Pumula South, Nkulumane 12 or nearby. Budget:",
                "Properties already viewed / areas to avoid",
                "Agent follow-up notes",
            ],
            row_height=11 * mm,
        ),
        Spacer(1, 3 * mm),
        note_box(
            "Client Consent",
            "I confirm that the information supplied is correct and I allow HouseLink Zimbabwe to contact me about matching rental properties. Signature / Date:",
        ),
        Spacer(1, 3 * mm),
        para(
            "Tip for WhatsApp clients: write clearly, tick the boxes that matter most, then send a photo or scanned copy back to HouseLink.",
            s["footer"],
        ),
    ]
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)


def update_manifest():
    if not MANIFEST.exists():
        return
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    row = {
        "title": "Tenant Rental Request Form",
        "description": "Branded manual form for tenants to record house, room, area, budget and move-in requirements before HouseLink starts matching rentals.",
        "category": "Property Forms",
        "sourceCategory": "Tenant Requirements",
        "fileName": OUTPUT.name,
        "fileUrl": FILE_URL,
        "fileType": "PDF",
        "tags": ["tenant", "rental", "requirements", "whatsapp", "print-ready", "manual form"],
        "sortOrder": 30,
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
