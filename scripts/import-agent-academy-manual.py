from __future__ import annotations

import json
import re
import shutil
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
DEFAULT_SOURCE = Path(r"D:\New folder\Desktop\Real Estate Business\REAL ESTATE AGENT TRAINING MANUAL.pdf")
OUT_DIR = ROOT / "public" / "uploads" / "academy"
RESOURCE_DIR = OUT_DIR / "resources"
LOGO = ROOT / "public" / "brand" / "houselink-full-lockup.png"
MANUAL_URL = "/uploads/academy/houselink-zimbabwe-real-estate-agent-training-manual.pdf"

GREEN = colors.HexColor("#047857")
EMERALD = colors.HexColor("#10B981")
INK = colors.HexColor("#0F172A")
MIST = colors.HexColor("#F8FAFC")
LINE = colors.HexColor("#CBD5E1")

RESOURCES = [
    ("Seller Information Form", "Client Documents", 275),
    ("Buyer Registration Form", "Client Documents", 277),
    ("Tenant Registration Form", "Client Documents", 278),
    ("Landlord Registration Form", "Client Documents", 279),
    ("Property Listing Form", "Client Documents", 280),
    ("Buyer Needs Analysis Form", "Client Documents", 281),
    ("Tenant Needs Analysis Form", "Client Documents", 282),
    ("Property Viewing Register", "Client Documents", 283),
    ("Property Inspection Checklist", "Client Documents", 284),
    ("Viewing Feedback Form", "Client Documents", 285),
    ("Property Appraisal Form", "Client Documents", 286),
    ("Listing Agreement Template", "Client Documents", 287),
    ("Offer to Purchase Template", "Client Documents", 288),
    ("Rental Application Form", "Client Documents", 289),
    ("Client Information Sheet", "Client Documents", 290),
    ("Daily Activity Planner", "Operations", 291),
    ("Weekly Planner", "Operations", 292),
    ("Monthly Planner", "Operations", 293),
    ("Appointment Schedule", "Operations", 294),
    ("Lead Tracking Sheet", "Operations", 295),
    ("Client Follow-Up Register", "Operations", 296),
    ("Open House Checklist", "Operations", 297),
    ("Property Marketing Checklist", "Marketing", 298),
    ("Property Photography Checklist", "Marketing", 299),
    ("Property Description Template", "Marketing", 300),
    ("Social Media Content Planner", "Marketing", 301),
    ("WhatsApp Marketing Templates", "Marketing", 302),
    ("Telephone Scripts", "Marketing", 303),
    ("Cold Calling Scripts", "Marketing", 304),
    ("Email Templates", "Marketing", 305),
    ("Objection Handling Guide", "Marketing", 306),
    ("Commission Calculation Worksheet", "Administration", 307),
    ("Expense Tracker", "Administration", 308),
    ("Mileage Log", "Administration", 309),
    ("File Checklist", "Administration", 310),
    ("Compliance Checklist", "Administration", 311),
    ("Document Submission Checklist", "Administration", 312),
    ("Monthly KPI Tracker", "Performance", 313),
    ("Listing Tracker", "Performance", 314),
    ("Closed Deals Register", "Performance", 315),
    ("Sales Performance Tracker", "Performance", 316),
    ("Personal Goal Planner", "Performance", 317),
    ("Weekly Performance Review", "Performance", 318),
    ("Property Selling Process Flowchart", "Quick Reference Guides", 319),
    ("Property Rental Process Flowchart", "Quick Reference Guides", 320),
    ("Buyer Journey Flowchart", "Quick Reference Guides", 321),
    ("Seller Journey Flowchart", "Quick Reference Guides", 322),
    ("Landlord Journey Flowchart", "Quick Reference Guides", 323),
    ("Agent Daily Workflow", "Quick Reference Guides", 324),
]

CATEGORY_TO_LIBRARY = {
    "Client Documents": "Property Forms",
    "Operations": "Agent Templates",
    "Marketing": "Marketing Resources",
    "Administration": "Compliance Documents",
    "Performance": "Assessments",
    "Quick Reference Guides": "Reference Guides",
}

BASE_FIELDS = [
    "Reference Number",
    "Date",
    "Client / Property",
    "Contact Details",
    "Property Address",
    "Description / Requirements",
    "Notes",
    "Action Required",
    "Follow-Up Date",
    "Agent Name",
    "Client / Agent Signatures",
]

SPECIFIC_FIELDS = {
    "Seller Information Form": ["Seller full name", "National ID / Company registration", "Ownership status", "Reason for selling", "Target selling price", "Preferred mandate type"],
    "Buyer Registration Form": ["Buyer full name", "Preferred suburbs", "Property type", "Budget range", "Funding method", "Purchase timeframe"],
    "Tenant Registration Form": ["Tenant full name", "Employer / income source", "Monthly budget", "Move-in date", "Preferred lease term", "Occupants"],
    "Landlord Registration Form": ["Landlord full name", "Property ownership details", "Rental expectation", "Management requirements", "Access arrangements", "Banking notes"],
    "Property Listing Form": ["Listing type", "Bedrooms / bathrooms", "Land size", "Asking price / rent", "Key features", "Marketing approval"],
    "Buyer Needs Analysis Form": ["Must-have features", "Preferred locations", "Financing readiness", "Viewing availability", "Deal breakers", "Decision makers"],
    "Tenant Needs Analysis Form": ["Required move-in date", "Household size", "Employment status", "Pets / special requirements", "Deposit readiness", "References"],
    "Property Viewing Register": ["Viewing date/time", "Visitor name", "Visitor phone", "Property viewed", "Feedback summary", "Next step"],
    "Property Inspection Checklist": ["Exterior condition", "Interior condition", "Utilities", "Security", "Repairs required", "Photos attached"],
    "Viewing Feedback Form": ["Overall impression", "Price feedback", "Condition feedback", "Client interest level", "Concerns", "Recommended follow-up"],
    "Property Appraisal Form": ["Comparable property 1", "Comparable property 2", "Condition rating", "Market value estimate", "Recommended asking price", "Appraisal notes"],
    "Listing Agreement Template": ["Owner authority", "Mandate period", "Commission terms", "Marketing permissions", "Access arrangements", "Special conditions"],
    "Offer to Purchase Template": ["Buyer details", "Offer amount", "Deposit amount", "Conditions precedent", "Acceptance deadline", "Seller decision"],
    "Rental Application Form": ["Applicant details", "Employment details", "Income verification", "References", "Emergency contact", "Approval decision"],
    "Client Information Sheet": ["Client type", "Communication preference", "Key needs", "Important dates", "Documents received", "Relationship notes"],
    "Daily Activity Planner": ["Prospecting calls", "Follow-ups", "Viewings", "Listings", "Admin tasks", "End-of-day review"],
    "Weekly Planner": ["Weekly objectives", "Appointments", "Listing targets", "Lead targets", "Marketing tasks", "Weekly review"],
    "Monthly Planner": ["Monthly goals", "Pipeline review", "Marketing campaign", "Training focus", "Revenue target", "Month-end review"],
    "Appointment Schedule": ["Appointment date", "Time", "Client name", "Location", "Purpose", "Outcome"],
    "Lead Tracking Sheet": ["Lead source", "Lead status", "Assigned agent", "Last contact", "Next action", "Conversion outcome"],
    "Client Follow-Up Register": ["Client name", "Reason for follow-up", "Contact method", "Follow-up result", "Next follow-up", "Responsible person"],
    "Open House Checklist": ["Property readiness", "Signage", "Brochures", "Visitor register", "Safety checks", "Post-event follow-up"],
    "Property Marketing Checklist": ["Listing copy", "Photography", "Portal upload", "Social media", "WhatsApp broadcast", "Performance review"],
    "Property Photography Checklist": ["Front elevation", "Living areas", "Bedrooms", "Bathrooms", "Kitchen", "Defects / repairs"],
    "Property Description Template": ["Headline", "Opening summary", "Features", "Location benefits", "Viewing instructions", "Compliance notes"],
    "Social Media Content Planner": ["Platform", "Content theme", "Caption", "Media required", "Publish date", "Performance result"],
    "WhatsApp Marketing Templates": ["Audience", "Message purpose", "Approved wording", "Property link", "Call to action", "Response tracking"],
    "Telephone Scripts": ["Call objective", "Opening", "Needs questions", "Value statement", "Objection response", "Close / next step"],
    "Cold Calling Scripts": ["Prospect type", "Introduction", "Permission question", "Qualification questions", "Appointment ask", "Follow-up plan"],
    "Email Templates": ["Email purpose", "Subject line", "Opening", "Body message", "Attachments", "Call to action"],
    "Objection Handling Guide": ["Objection", "Client concern", "Professional response", "Evidence required", "Follow-up action", "Outcome"],
    "Commission Calculation Worksheet": ["Transaction value", "Commission rate", "Gross commission", "HouseLink share", "Agent share", "Approval signature"],
    "Expense Tracker": ["Expense date", "Supplier", "Category", "Amount", "Receipt attached", "Approval status"],
    "Mileage Log": ["Travel date", "Start location", "Destination", "Purpose", "Kilometres", "Client / property reference"],
    "File Checklist": ["Client documents", "Property documents", "Agreement documents", "Marketing records", "Communication records", "Completion records"],
    "Compliance Checklist": ["Identity verified", "Authority confirmed", "Documents checked", "Disclosure completed", "Record filed", "Supervisor review"],
    "Document Submission Checklist": ["Document name", "Submitted by", "Received by", "Date received", "Completeness check", "Storage location"],
    "Monthly KPI Tracker": ["Leads generated", "Listings won", "Viewings completed", "Offers received", "Deals closed", "Revenue / commission"],
    "Listing Tracker": ["Property", "Listing date", "Status", "Marketing actions", "Enquiries", "Seller updates"],
    "Closed Deals Register": ["Deal reference", "Client name", "Property", "Transaction type", "Completion date", "Commission status"],
    "Sales Performance Tracker": ["Sales target", "Actual sales", "Pipeline value", "Conversion rate", "Lessons learned", "Next action"],
    "Personal Goal Planner": ["Goal", "Reason", "Actions required", "Deadline", "Progress", "Review notes"],
    "Weekly Performance Review": ["Wins", "Challenges", "Leads followed up", "Listings progressed", "Skills improved", "Next week focus"],
    "Property Selling Process Flowchart": ["Step 1: Prospect / listing lead", "Step 2: Appraise property", "Step 3: Sign listing agreement", "Step 4: Market property", "Step 5: Negotiate offer", "Step 6: Complete transaction"],
    "Property Rental Process Flowchart": ["Step 1: Register landlord / property", "Step 2: Market rental", "Step 3: Qualify tenant", "Step 4: Conduct viewing", "Step 5: Process application", "Step 6: Lease and handover"],
    "Buyer Journey Flowchart": ["Step 1: Register buyer", "Step 2: Analyse needs", "Step 3: Shortlist properties", "Step 4: View properties", "Step 5: Submit offer", "Step 6: Complete purchase"],
    "Seller Journey Flowchart": ["Step 1: Register seller", "Step 2: Appraise property", "Step 3: Agree mandate", "Step 4: Market listing", "Step 5: Review offers", "Step 6: Transfer / completion"],
    "Landlord Journey Flowchart": ["Step 1: Register landlord", "Step 2: Inspect property", "Step 3: Agree terms", "Step 4: Market rental", "Step 5: Approve tenant", "Step 6: Manage lease"],
    "Agent Daily Workflow": ["Morning pipeline review", "Prospecting", "Client follow-ups", "Viewings / inspections", "Documentation", "End-of-day CRM update"],
}


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("Title", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=INK, spaceAfter=8),
        "subtitle": ParagraphStyle("Subtitle", parent=base["Normal"], fontName="Helvetica", fontSize=9, leading=12, textColor=colors.HexColor("#475569")),
        "section": ParagraphStyle("Section", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=GREEN, spaceBefore=10, spaceAfter=5),
        "body": ParagraphStyle("Body", parent=base["Normal"], fontName="Helvetica", fontSize=8.5, leading=12, textColor=INK),
        "small": ParagraphStyle("Small", parent=base["Normal"], fontName="Helvetica", fontSize=7, leading=9, textColor=colors.HexColor("#64748B")),
        "footer": ParagraphStyle("Footer", parent=base["Normal"], fontName="Helvetica", fontSize=7, leading=9, textColor=colors.HexColor("#64748B"), alignment=TA_CENTER),
        "cover": ParagraphStyle("Cover", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=11, textColor=GREEN, alignment=TA_LEFT),
    }


def para(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text.replace("&", "&amp;"), style)


def field_table(fields: list[str], style: ParagraphStyle) -> Table:
    rows = [[para("Field", style), para("Details", style)]]
    for field in fields:
        rows.append([para(field, style), ""])
    table = Table(rows, colWidths=[54 * mm, 118 * mm], rowHeights=[8 * mm] + [10 * mm] * len(fields), repeatRows=1)
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
            ]
        )
    )
    return table


def checkbox_table(items: list[str], style: ParagraphStyle) -> Table:
    rows = []
    for item in items:
        rows.append(["☐", para(item, style)])
    table = Table(rows, colWidths=[8 * mm, 164 * mm], rowHeights=[8 * mm] * len(rows))
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
    canvas.drawString(18 * mm, 289.5 * mm, "HouseLink Zimbabwe Agent Academy")
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(105 * mm, 9 * mm, f"{title} • Version 1.0 • Generated {date.today().isoformat()} • Page {doc.page}")
    canvas.restoreState()


def make_resource_pdf(title: str, category: str, manual_page: int, output: Path):
    s = styles()
    doc = SimpleDocTemplate(str(output), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=22 * mm, bottomMargin=16 * mm)
    story = []
    if LOGO.exists():
        img = Image(str(LOGO), width=48 * mm, height=14 * mm)
        img.hAlign = "LEFT"
        story.append(img)
    story.append(Spacer(1, 5 * mm))
    story.append(para(title, s["title"]))
    story.append(para(f"<b>Category:</b> {category} &nbsp;&nbsp; <b>Manual reference:</b> page {manual_page} &nbsp;&nbsp; <b>Format:</b> A4 print-ready PDF", s["subtitle"]))
    story.append(Spacer(1, 3 * mm))
    purpose = f"This professional HouseLink Zimbabwe template is recreated from the official Real Estate Agent Training Manual. Complete all applicable fields accurately, obtain required signatures where applicable, and file the completed document according to company procedures."
    story.append(para("Purpose", s["section"]))
    story.append(para(purpose, s["body"]))
    story.append(para("Document Control", s["section"]))
    story.append(field_table(["Reference Number", "Date", "Branch / Office", "Prepared By", "Reviewed By", "Status"], s["body"]))
    story.append(para("Primary Details", s["section"]))
    story.append(field_table(BASE_FIELDS, s["body"]))
    story.append(PageBreak())
    story.append(para("Role-Specific Details", s["section"]))
    story.append(field_table(SPECIFIC_FIELDS.get(title, []), s["body"]))
    story.append(para("Completion Checklist", s["section"]))
    story.append(checkbox_table(["All required fields completed", "Supporting documents attached where applicable", "Client has reviewed the information", "Agent has checked accuracy", "Document filed in the correct HouseLink record"], s["body"]))
    story.append(para("Office Use Only", s["section"]))
    story.append(field_table(["Reviewed By", "Review Date", "Approval / Outcome", "Comments", "Final Filing Location"], s["body"]))
    story.append(Spacer(1, 6 * mm))
    story.append(para("Confidentiality Notice: This document is intended for authorised HouseLink Zimbabwe real estate training and operational use only.", s["footer"]))
    doc.build(story, onFirstPage=lambda c, d: header_footer(c, d, title), onLaterPages=lambda c, d: header_footer(c, d, title))


def make_manual_cover(source: Path, target: Path):
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def main():
    source = DEFAULT_SOURCE
    if not source.exists():
        raise SystemExit(f"Manual PDF not found: {source}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    RESOURCE_DIR.mkdir(parents=True, exist_ok=True)
    manual_target = OUT_DIR / "houselink-zimbabwe-real-estate-agent-training-manual.pdf"
    make_manual_cover(source, manual_target)
    manifest = [
        {
            "title": "HouseLink Zimbabwe Real Estate Agent Training Manual",
            "description": "Official complete HouseLink Zimbabwe real estate sales and letting agent training manual.",
            "category": "Training Manuals",
            "fileName": manual_target.name,
            "fileUrl": MANUAL_URL,
            "fileType": "PDF",
            "tags": ["manual", "training", "real estate", "agent academy"],
            "sortOrder": 0,
            "version": 1,
            "fileSizeBytes": manual_target.stat().st_size,
            "manualPage": 1,
        }
    ]
    for index, (title, category, manual_page) in enumerate(RESOURCES, start=1):
        slug = slugify(title)
        output = RESOURCE_DIR / f"{slug}.pdf"
        make_resource_pdf(title, category, manual_page, output)
        library_category = CATEGORY_TO_LIBRARY.get(category, category)
        manifest.append(
            {
                "title": title,
                "description": f"Branded A4 print-ready {title.lower()} recreated from the official HouseLink Zimbabwe training manual.",
                "category": library_category,
                "sourceCategory": category,
                "fileName": output.name,
                "fileUrl": f"/uploads/academy/resources/{output.name}",
                "fileType": "PDF",
                "tags": [category.lower(), "training resource", "agent academy", "print-ready"],
                "sortOrder": index,
                "version": 1,
                "fileSizeBytes": output.stat().st_size,
                "manualPage": manual_page,
            }
        )
    (OUT_DIR / "academy-resources-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"manual": str(manual_target), "resources": len(manifest) - 1, "manifest": str(OUT_DIR / "academy-resources-manifest.json")}, indent=2))


if __name__ == "__main__":
    main()
