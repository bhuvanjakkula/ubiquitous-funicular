"""Unposted PDF workpaper rendered from the persisted evidence JSON."""
from io import BytesIO
from pathlib import Path
import json
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from .pack import atomic_write


def write_evidence_pdf(pack):
    path = Path(pack.json_path).with_suffix(".pdf")
    body = json.loads(Path(pack.json_path).read_text(encoding="utf-8"))
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="SmallText", fontSize=8, leading=11, spaceAfter=5))
    styles.add(ParagraphStyle(name="Hash", fontName="Courier", fontSize=7, leading=10, spaceAfter=8))
    def p(text, style="BodyText"):
        return Paragraph(escape(str(text)), styles[style])
    def money(cents):
        if cents is None: return "Unknown"
        whole, fraction = divmod(abs(cents), 100)
        return f"{'-' if cents < 0 else ''}{whole:,}.{fraction:02d}"
    story = [p("LedgerTrace", "Title"), p("Historical cash integrity workpaper", "Heading2"),
             p(body["disclaimer"], "SmallText"), Spacer(1, 12)]
    job, rf = body["job"], body["rollforward"]
    story += [p(job["entity_name"], "Heading1"), p(f"Period {job['period_start']} to {job['period_end']} | {job['currency']}"),
              p("Job " + job["id"], "SmallText"), p("Cash roll-forward", "Heading2")]
    rows = [["Measure", "Amount / result"]]
    for label, key in (("Opening cash", "opening_cash_cents"), ("Period cash movement", "period_cash_movement_cents"),
                       ("Ending cash", "ending_cash_cents"), ("Bank ending", "bank_ending_cents")):
        rows.append([label, money(rf[key])])
    rows += [["Cash identity", str(rf["identity_ok"])], ["Bank versus GL", str(rf["bank_vs_gl_ok"])],
             ["Matched bank lines", str(body["matches_summary"]["matched"])]]
    table = Table(rows, colWidths=[280, 200], hAlign="LEFT")
    table.setStyle(TableStyle([("BACKGROUND", (0,0),(-1,0),colors.HexColor("#193f43")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white), ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.whitesmoke,colors.white]),
        ("BOTTOMPADDING",(0,0),(-1,-1),8), ("TOPPADDING",(0,0),(-1,-1),8)]))
    story += [table, p("Input provenance", "Heading2")]
    for kind in ("bank", "gl"):
        story += [p(kind.upper() + " SHA-256", "SmallText"), p(job["input_" + kind + "_sha256"], "Hash")]
    story += [p("Findings for professional review", "Heading2")]
    if not body["findings"]:
        story.append(p("No FAIL, UNKNOWN, or INFO findings in this run. This is not a compliance certificate."))
    for f in body["findings"]:
        story += [p(f["severity"] + " | " + f["title"], "Heading3"),
                  p(f["detector_id"] + " | amount cents: " + str(f["amount_cents"]), "SmallText"),
                  p("Finding ID: " + f["id"], "SmallText")]
        for label in ("cite_bank_ids", "cite_line_ids", "cite_entry_ids"):
            if f[label]: story.append(p(label + ": " + ", ".join(f[label]), "SmallText"))
        for key, value in f["payload"].items():
            story.append(p(key + ": " + json.dumps(value, ensure_ascii=True), "SmallText"))
    if body["proposed_review_actions"]:
        story.append(p("Proposed review actions", "Heading2"))
        for action in body["proposed_review_actions"]:
            story.append(p(action["finding_id"] + ": " + action["note"], "SmallText"))
    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#526267"))
        canvas.drawString(48, 27, "UNPOSTED WORKPAPER - FOR REVIEW ONLY")
        canvas.drawRightString(564, 27, str(doc.page))
        canvas.restoreState()
    stream = BytesIO()
    SimpleDocTemplate(stream, pagesize=(612,792), leftMargin=48, rightMargin=48,
                      topMargin=42, bottomMargin=48, title="LedgerTrace unposted workpaper").build(story, onFirstPage=footer, onLaterPages=footer)
    atomic_write(path, stream.getvalue())
    pack.pdf_path = str(path)
    return path

