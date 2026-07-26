#!/usr/bin/env python3
"""Generate practical HouseLink Academy case files and scripts."""

from __future__ import annotations

import json
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "uploads" / "academy" / "resources"
MANIFEST = ROOT / "public" / "uploads" / "academy" / "academy-resources-manifest.json"

GREEN = colors.HexColor("#047857")
INK = colors.HexColor("#0F172A")
MIST = colors.HexColor("#F8FAFC")
LINE = colors.HexColor("#CBD5E1")


ASSETS = [
    {
        "title": "Overpriced Seller CMA Case File",
        "description": "Practice case file for pricing a Zimbabwe property with comparable evidence and seller objection handling.",
        "category": "Case Files",
        "sourceCategory": "Case Files",
        "sections": [
            ("Scenario", "A Borrowdale seller wants USD 245,000 because a neighbour is asking the same. Your evidence shows likely buyer response between USD 198,000 and USD 215,000."),
            ("Learner Task", "Prepare a CMA, recommended range, pricing risk note, and seller conversation plan. Identify which claims are facts and which are assumptions."),
            ("Evidence Required", "Submit comparables, adjusted price range, pricing recommendation, objection response, and documented next action."),
        ],
    },
    {
        "title": "Seller Listing Presentation Video Script",
        "description": "Trainer-ready script for recording a listing presentation lesson with pricing, commission, documents, and close.",
        "category": "Sales Scripts",
        "sourceCategory": "Video Scripts",
        "sections": [
            ("Opening", "Confirm the seller's goal, reason for selling, timing, decision makers, and preferred communication route."),
            ("Core Demonstration", "Show market evidence, HouseLink marketing plan, document checklist, commission explanation, and mandate options."),
            ("Recording Notes", "Capture one price objection, one commission objection, and one document-risk question. End with written next steps."),
        ],
    },
    {
        "title": "Buyer Qualification Roleplay Script",
        "description": "Roleplay script for turning a vague buyer enquiry into a documented client brief.",
        "category": "Sales Scripts",
        "sourceCategory": "Roleplay Scripts",
        "sections": [
            ("Scenario", "A buyer says: 'I want anything nice in Harare, maybe USD 80,000 to USD 120,000.'"),
            ("Questions", "Confirm budget, finance readiness, preferred suburbs, timing, decision makers, must-haves, deal-breakers, and viewing availability."),
            ("Assessment", "Learner must produce a shortlist rule and decide whether the enquiry is ready, incomplete, or low priority."),
        ],
    },
    {
        "title": "Tenant Screening Case File",
        "description": "Practice file for qualifying a tenant, checking references, and preparing a rental recommendation.",
        "category": "Case Files",
        "sourceCategory": "Case Files",
        "sections": [
            ("Scenario", "A tenant wants immediate occupation, has partial documents, and asks to pay deposit after moving in."),
            ("Learner Task", "Complete needs analysis, identify missing evidence, prepare landlord questions, and write a professional recommendation."),
            ("Risk Flags", "Urgent move-in, incomplete income evidence, unclear occupants, and request to bypass deposit process."),
        ],
    },
    {
        "title": "Offer Negotiation Case File",
        "description": "Counter-offer practice case for documenting price, conditions, deadlines, and escalation points.",
        "category": "Case Files",
        "sourceCategory": "Case Files",
        "sections": [
            ("Scenario", "A buyer offers USD 92,000 with inspection conditions. Seller counters at USD 98,000 with a 48-hour deadline."),
            ("Learner Task", "Prepare communication notes for both sides, record terms, confirm deadlines, and flag legal questions."),
            ("Pass Standard", "Neutral language, no pressure, complete written record, and correct escalation of contract interpretation."),
        ],
    },
    {
        "title": "Document Risk Case File",
        "description": "Compliance practice file covering owner authority, estate, cession, and signature risk flags.",
        "category": "Compliance Documents",
        "sourceCategory": "Case Files",
        "sections": [
            ("Scenario", "The instructor is not the named owner, the file mentions a deceased estate, and one document copy is unreadable."),
            ("Learner Task", "List risk flags, write file notes, identify documents to request, and state which actions must pause."),
            ("Escalation", "Refer legal interpretation to qualified professionals and HouseLink admin before marketing or accepting offers."),
        ],
    },
    {
        "title": "Zimbabwe Market Intelligence Update Template",
        "description": "Monthly template for tracking suburb demand, pricing signals, rental trends, and client questions.",
        "category": "Reference Guides",
        "sourceCategory": "Market Intelligence",
        "sections": [
            ("Market Signals", "Record suburb, property type, asking-price range, enquiry volume, rental demand, buyer objections, and listing ageing."),
            ("Client Questions", "Capture the questions buyers, sellers, tenants, and landlords asked most often this month."),
            ("Action", "Turn insights into one blog idea, one agent coaching point, and one listing-pricing adjustment."),
        ],
    },
    {
        "title": "Field Portfolio Mentor Sign-Off Form",
        "description": "Mentor/admin sign-off checklist for validating practical readiness before full professional certification.",
        "category": "Assessments",
        "sourceCategory": "Mentor Sign-Off",
        "sections": [
            ("Evidence Pack", "Prospecting log, listing file, qualification file, viewing record, compliance audit, KPI review, and learner reflection."),
            ("Mentor Review", "Mark each area as ready, developing, or needs resubmission. Add specific evidence-based comments."),
            ("Sign-Off", "Learner should only be marked client-ready when evidence shows professional judgement, documentation, and confidentiality."),
        ],
    },
]


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def para(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text.replace("&", "&amp;"), style)


def build_pdf(asset: dict) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{slugify(asset['title'])}.pdf"
    styles = getSampleStyleSheet()
    title = ParagraphStyle("Title", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=GREEN)
    heading = ParagraphStyle("Heading", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=GREEN)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.5, leading=13, textColor=INK)
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm)
    story = [para("HouseLink Agent Academy", heading), para(asset["title"], title), Spacer(1, 5 * mm)]
    story.append(overview(asset["description"], body))
    story.append(Spacer(1, 5 * mm))
    for section, text in asset["sections"]:
        story.append(para(section, heading))
        story.append(para(text, body))
        story.append(Spacer(1, 3 * mm))
    story.append(Spacer(1, 5 * mm))
    story.append(para("Use this file for Academy practice, trainer review, and field coaching. Remove or mask private client data before submission.", body))
    doc.build(story)
    return path


def overview(text: str, style: ParagraphStyle) -> Table:
    table = Table([[para(text, style)]], colWidths=[174 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), MIST),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    by_title = {item["title"]: item for item in manifest}
    next_sort = max(int(item.get("sortOrder", 0)) for item in manifest) + 1
    for asset in ASSETS:
      path = build_pdf(asset)
      item = {
          "title": asset["title"],
          "description": asset["description"],
          "category": asset["category"],
          "sourceCategory": asset["sourceCategory"],
          "fileName": path.name,
          "fileUrl": f"/uploads/academy/resources/{path.name}",
          "fileType": "PDF",
          "tags": ["practice", "case file", "agent academy", "trainer review"],
          "sortOrder": next_sort,
          "version": 1,
          "fileSizeBytes": path.stat().st_size,
          "manualPage": None,
      }
      by_title[asset["title"]] = item
      next_sort += 1
    MANIFEST.write_text(json.dumps(list(by_title.values()), indent=2), encoding="utf-8")
    print(json.dumps({"generated": len(ASSETS), "manifest": str(MANIFEST)}, indent=2))


if __name__ == "__main__":
    main()
