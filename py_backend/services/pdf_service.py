from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    NextPageTemplate,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import uuid


def create_pdf(data):
    filename = f"{uuid.uuid4()}.pdf"

    doc = BaseDocTemplate(filename)
    styles = getSampleStyleSheet()

    HEADER_HEIGHT = 100

    # ===== DYNAMIC VALUES =====
    institution = data["institution"]
    subject = data["subject"]
    questions = data["questions"]

    total_q = len(questions)
    time = total_q  # 1 min per question
    marks = total_q  # 1 mark per question

    # ===== HEADER FUNCTION (DYNAMIC) =====
    def draw_header(canvas, doc):
        if doc.page != 1:
            return

        canvas.saveState()
        width, height = doc.pagesize

        canvas.setFont("Helvetica-Bold", 14)
        canvas.drawCentredString(width / 2, height - 40, institution)

        canvas.setFont("Helvetica", 12)
        canvas.drawCentredString(width / 2, height - 60, f"Subject: {subject}")

        canvas.drawString(doc.leftMargin, height - 80, f"Time: {time} min")
        canvas.drawRightString(
            width - doc.rightMargin, height - 80, f"Full Marks: {marks}"
        )

        # line under header
        canvas.line(
            doc.leftMargin,
            height - HEADER_HEIGHT,
            width - doc.rightMargin,
            height - HEADER_HEIGHT,
        )

        # vertical divider
        canvas.line(width / 2, doc.bottomMargin, width / 2, height - HEADER_HEIGHT)

        canvas.restoreState()

    # ===== LATER PAGE LINE =====
    def draw_line(canvas, doc):
        canvas.saveState()
        width, height = doc.pagesize

        canvas.line(width / 2, doc.bottomMargin, width / 2, height - 40)

        canvas.restoreState()

    # ===== FRAMES =====

    # First page
    frame1_first = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        (doc.width / 2) - 10,
        doc.height - HEADER_HEIGHT,
        id="col1_first",
    )

    frame2_first = Frame(
        doc.leftMargin + (doc.width / 2) + 10,
        doc.bottomMargin,
        (doc.width / 2) - 10,
        doc.height - HEADER_HEIGHT,
        id="col2_first",
    )

    # Later pages
    frame1_later = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        (doc.width / 2) - 10,
        doc.height,
        id="col1_later",
    )

    frame2_later = Frame(
        doc.leftMargin + (doc.width / 2) + 10,
        doc.bottomMargin,
        (doc.width / 2) - 10,
        doc.height,
        id="col2_later",
    )

    # ===== TEMPLATES =====
    firstpage = PageTemplate(
        id="firstpage", frames=[frame1_first, frame2_first], onPage=draw_header
    )

    laterpage = PageTemplate(
        id="laterpage", frames=[frame1_later, frame2_later], onPage=draw_line
    )

    doc.addPageTemplates([firstpage, laterpage])

    # ===== STYLES =====
    question_style = ParagraphStyle("Question", fontSize=10, spaceAfter=6)

    option_style = ParagraphStyle(
        "Option", fontSize=9, leftIndent=10, spaceAfter=2
    )

    # ===== BUILD CONTENT =====
    content = []

    # switch template after first page
    content.append(NextPageTemplate("laterpage"))

    for i, q in enumerate(questions, 1):
        content.append(Paragraph(f"{i}. {q['question']}", question_style))

        for opt in q["options"]:
            content.append(Paragraph(opt, option_style))

        content.append(Spacer(1, 8))

    # ===== BUILD PDF =====
    doc.build(content)

    return filename