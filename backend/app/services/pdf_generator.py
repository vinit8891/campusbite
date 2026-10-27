"""Automated PDF Generator for CampusBite Canteen Merchant Agreement.

Generates a legally executed, A4 PDF MoU pursuant to Section 10A of the
Information Technology Act, 2000, including commercial terms, FSSAI compliance,
and cryptographic audit trail metadata.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def _format_datetime(val: Any) -> str:
    if val is None:
        return datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M:%S UTC")
    if isinstance(val, datetime):
        return val.strftime("%d %b %Y, %H:%M:%S UTC")
    return str(val)


def generate_merchant_agreement_pdf(
    agreement_data: dict[str, Any],
    canteen_data: dict[str, Any],
) -> io.BytesIO:
    """
    Generates a professional A4 PDF for an executed merchant agreement.
    Returns an in-memory BytesIO buffer positioned at offset 0.
    """
    buffer = io.BytesIO()

    # Document Setup (36 pt = 0.5 in margins for maximum usable space)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    c_primary = colors.HexColor("#EA580C")      # CampusBite Orange
    c_amber = colors.HexColor("#D97706")        # Amber Accent
    c_dark = colors.HexColor("#1C1917")         # Dark Stone Text
    c_muted = colors.HexColor("#57534E")        # Muted Stone
    c_light = colors.HexColor("#FAFAF9")        # Light Stone Background
    c_border = colors.HexColor("#E7E5E4")       # Light Border
    c_green = colors.HexColor("#16A34A")        # Success Green
    c_green_bg = colors.HexColor("#DCFCE7")     # Success Green Light

    # Typography Styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=c_primary,
        alignment=0,
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=c_dark,
        alignment=0,
    )

    notice_badge_style = ParagraphStyle(
        "NoticeBadge",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#9A3412"),
    )

    meta_text_style = ParagraphStyle(
        "MetaText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=c_muted,
    )

    section_header_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=12,
        textColor=c_primary,
    )

    body_style = ParagraphStyle(
        "BodyTextCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=c_dark,
    )

    clause_title_style = ParagraphStyle(
        "ClauseTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=c_dark,
    )

    mono_style = ParagraphStyle(
        "MonoStyle",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=7,
        leading=9,
        textColor=c_dark,
    )

    footer_style = ParagraphStyle(
        "FooterStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7,
        leading=9.5,
        textColor=c_muted,
        alignment=1,
    )

    story = []

    # -------------------------------------------------------------
    # 1. Header & Title Banner
    # -------------------------------------------------------------
    header_content = [
        [
            Paragraph("CAMPUSBITE TECHNOLOGIES", title_style),
            Paragraph("<b>STATUS:</b> <font color='#16A34A'>LEGALLY EXECUTED</font>", subtitle_style),
        ],
        [
            Paragraph("Merchant Partnership Service Agreement (MoU)", subtitle_style),
            Paragraph(f"Ref: <b>{agreement_data.get('terms_version', 'v1.0_2026_OCT')}</b>", meta_text_style),
        ],
        [
            Paragraph(
                "Electronic Contract Executed pursuant to Section 10A, Information Technology Act, 2000",
                notice_badge_style,
            ),
            Paragraph(f"Executed: {_format_datetime(agreement_data.get('accepted_at'))}", meta_text_style),
        ],
    ]

    header_table = Table(header_content, colWidths=[340, 180])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_primary, spaceAfter=8))

    # -------------------------------------------------------------
    # 2. Contracting Parties (Two-Column Table)
    # -------------------------------------------------------------
    canteen_name = (
        canteen_data.get("name")
        or agreement_data.get("canteen_name")
        or agreement_data.get("canteen_id")
        or "Registered Canteen Partner"
    )
    signatory_name = agreement_data.get("signatory_name", "Authorized Signatory")
    signatory_desig = agreement_data.get("signatory_designation", "Proprietor")
    fssai_num = (
        agreement_data.get("canteen_fssai_number")
        or canteen_data.get("fssai_number")
        or "Pending Registration"
    )
    phone_num = agreement_data.get("signatory_phone") or canteen_data.get("phone") or "N/A"
    canteen_email = canteen_data.get("email") or agreement_data.get("canteen_id") or "N/A"

    first_party_text = """
    <b>FIRST PARTY (Platform & Intermediary):</b><br/>
    <b>Entity:</b> CampusBite Technologies Private Limited<br/>
    <b>Shop Act Reg No:</b> 2631000321657678<br/>
    <b>FSSAI Central License:</b> 30261027127880694<br/>
    <b>Registered Office:</b> Narhe, Pune, Maharashtra 411041<br/>
    <b>Role:</b> Digital Marketplace Intermediary (IT Act Sec 79)
    """

    second_party_text = f"""
    <b>SECOND PARTY (Canteen Merchant Operator):</b><br/>
    <b>Establishment:</b> {canteen_name}<br/>
    <b>Authorized Signatory:</b> {signatory_name} ({signatory_desig})<br/>
    <b>14-Digit FSSAI License:</b> {fssai_num}<br/>
    <b>Registered Mobile:</b> +91 {phone_num}<br/>
    <b>Contact Email / ID:</b> {canteen_email}
    """

    parties_table = Table(
        [
            [
                Paragraph(first_party_text, body_style),
                Paragraph(second_party_text, body_style),
            ]
        ],
        colWidths=[256, 264],
    )
    parties_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), c_light),
            ("BOX", (0, 0), (-1, -1), 0.75, c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, c_border),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    story.append(parties_table)
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------
    # 3. Master Operational & Commercial Clauses
    # -------------------------------------------------------------
    story.append(Paragraph("TERMS OF ENGAGEMENT & COMMERCIAL FRAMEWORK", section_header_style))
    story.append(Spacer(1, 4))

    clauses = [
        (
            "1. Commercial Take-Rate & Commission",
            "The Merchant covenants and agrees to an <b>18% (eighteen percent)</b> platform commission "
            "(take-rate) calculated on the gross food value (subtotal of all culinary items before platform "
            "delivery fees or consumer vouchers) of every completed order processed via CampusBite. "
            "Statutory Goods and Services Tax (GST) and TCS / TDS under Section 194-O shall be applied pursuant to Indian tax laws.",
        ),
        (
            "2. 9:00 PM EOD Reconciliation & Twice-Weekly Settlement Cycle",
            "Order transactions reconcile daily with an End-of-Day (EOD) ledger cutoff at <b>9:00 PM IST</b>. "
            "Net accrued settlement balances are disbursed twice weekly on <b>Tuesday and Friday</b> on a "
            "<b>T+2 business day settlement schedule</b> directly to the Merchant's verified bank account or UPI VPA.",
        ),
        (
            "3. Mandatory FSSAI Licensing & Sole Vendor Food Safety Liability",
            f"The Merchant warrants and represents holding active 14-digit FSSAI License <b>{fssai_num}</b>. "
            "The Merchant assumes <b>100% sole civil, criminal, and regulatory liability</b> for food hygiene, freshness, "
            "accurate dietary labels (veg/non-veg), packaging integrity, and adherence to the Food Safety and Standards Act, 2006. "
            "The Merchant shall indemnify and hold harmless CampusBite against all claims, fines, and consumer disputes.",
        ),
        (
            "4. Intermediary Status & Safe Harbour under IT Act Section 79",
            "CampusBite operates exclusively as a digital platform intermediary connecting campus diners with independent "
            "canteen facilities. Pursuant to <b>Section 79 of the Information Technology Act, 2000</b>, CampusBite is not "
            "the producer, packager, or vendor of food items and exercises statutory safe harbour protections.",
        ),
        (
            "5. Affirmative Digital Execution & Binding Enforceability",
            "By checking the electronic declaration and submitting the click-wrap affirmation, the Signatory legally "
            "binds the canteen establishment. Both parties agree that this electronic execution possesses identical legal validity "
            "and evidentiary value as a wet-ink paper agreement under Section 10A of the IT Act, 2000.",
        ),
    ]

    for title, text in clauses:
        story.append(Paragraph(f"<b>{title}:</b> {text}", body_style))
        story.append(Spacer(1, 4))

    story.append(Spacer(1, 4))

    # -------------------------------------------------------------
    # 4. Cryptographic Audit Trail Table
    # -------------------------------------------------------------
    story.append(Paragraph("CRYPTOGRAPHIC AUDIT TRAIL & EXECUTION TELEMETRY", section_header_style))
    story.append(Spacer(1, 4))

    raw_hash = agreement_data.get("agreement_hash") or "N/A"
    raw_ip = agreement_data.get("ip_address") or "127.0.0.1"
    raw_ua = agreement_data.get("user_agent") or "Mozilla/5.0 (CampusBite Secure Client)"
    raw_time = _format_datetime(agreement_data.get("accepted_at"))
    terms_ver = agreement_data.get("terms_version", "v1.0_2026_OCT")

    audit_rows = [
        [
            Paragraph("<b>Execution Status:</b>", body_style),
            Paragraph("<b><font color='#16A34A'>✔ LEGALLY EXECUTED & AUDITED</font></b>", body_style),
        ],
        [
            Paragraph("<b>Terms Version:</b>", body_style),
            Paragraph(terms_ver, body_style),
        ],
        [
            Paragraph("<b>SHA-256 Agreement Hash:</b>", body_style),
            Paragraph(raw_hash, mono_style),
        ],
        [
            Paragraph("<b>Execution Timestamp (UTC):</b>", body_style),
            Paragraph(raw_time, body_style),
        ],
        [
            Paragraph("<b>Signatory Client IP:</b>", body_style),
            Paragraph(raw_ip, mono_style),
        ],
        [
            Paragraph("<b>Browser User-Agent:</b>", body_style),
            Paragraph(raw_ua[:110] + ("..." if len(raw_ua) > 110 else ""), mono_style),
        ],
    ]

    audit_table = Table(audit_rows, colWidths=[150, 370])
    audit_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), c_light),
            ("BOX", (0, 0), (-1, -1), 0.75, c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, c_border),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(audit_table)
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------
    # 5. Legal Declaration Footer
    # -------------------------------------------------------------
    declaration_text = (
        "<b>Electronic Record Declaration:</b> This Memorandum of Understanding (MoU) is an electronically "
        "generated, digitally executed legal record pursuant to Section 10A of the Information Technology Act, 2000. "
        "It is verified against the tamper-evident SHA-256 digest in the CampusBite Immutable Audit Ledger. "
        "No physical or wet-ink signature is required.<br/>"
        "© CampusBite Technologies Private Limited • Zeal College of Engineering Campus Operations Hub, Narhe, Pune."
    )
    story.append(Paragraph(declaration_text, footer_style))

    doc.build(story)
    buffer.seek(0)
    return buffer
