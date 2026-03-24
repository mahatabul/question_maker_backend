from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    NextPageTemplate,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

# Document
doc = BaseDocTemplate("exam_layout.pdf")

styles = getSampleStyleSheet()

# ===== HEADER HEIGHT =====
HEADER_HEIGHT = 100

# ===== FRAMES (2 columns BELOW header) =====
frame1_firstpage = Frame(
    doc.leftMargin,
    doc.bottomMargin,
    (doc.width / 2) - 10,
    doc.height - HEADER_HEIGHT/2,
    id="col1_first",
)

frame2_first = Frame(
    doc.leftMargin + (doc.width / 2) + 10,
    doc.bottomMargin,
    (doc.width / 2) - 10,
    doc.height - HEADER_HEIGHT/2,
    id="col2_first",
)

frame1_laterpage = Frame(
    doc.leftMargin,
    100,
    (doc.width / 2) - 10,
    doc.height,
    id="col1_later",
)

frame2_later = Frame(
    doc.leftMargin + (doc.width / 2) + 10,
    100,
    (doc.width / 2) - 10,
    doc.height,
    id="col2_later",
)


# ===== DRAW HEADER + LINES =====
def draw_header(canvas, doc):
    if doc.page != 1:
        return
    canvas.saveState()

    width, height = doc.pagesize

    # Institution Name (center)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.drawCentredString(width / 2, height - 40, "Your Institution Name")

    # Subject Name
    canvas.setFont("Helvetica", 12)
    canvas.drawCentredString(width / 2, height - 60, "Subject: Chemistry")

    # Time (left)
    canvas.drawString(doc.leftMargin, height - 80, "Time: 30 min")

    # Full Marks (right)
    canvas.drawRightString(width - doc.rightMargin, height - 80, "Full Marks: 30")

    # Horizontal line under header
    canvas.line(
        doc.leftMargin,
        height - HEADER_HEIGHT,
        width - doc.rightMargin,
        height - HEADER_HEIGHT,
    )

    # Vertical line between columns
    canvas.line(width / 2, doc.bottomMargin, width / 2, height - HEADER_HEIGHT)

    canvas.restoreState()

def drawline(canvas,doc):
    canvas.saveState()

    width, height = doc.pagesize
    # Vertical line between columns
    canvas.line(width / 2, doc.bottomMargin, width / 2, height - 50)

    canvas.restoreState()


# Page Template
firstpage = PageTemplate(
    id="firstpage", frames=[frame1_firstpage, frame2_first], onPage=draw_header
)
secondpage = PageTemplate(
    id="secondpageTwoCol",
    frames=[frame1_laterpage, frame2_later],
    onPage=drawline
)

doc.addPageTemplates([firstpage, secondpage])

# ===== STYLES =====
question_style = ParagraphStyle("Question", fontSize=10, spaceAfter=6)

option_style = ParagraphStyle("Option", fontSize=9, leftIndent=10, spaceAfter=2)

# ===== SAMPLE DATA =====
questions = [
    {
        "question": "Which is a metal?",
        "options": ["A. Oxygen", "B. Nitrogen", "C. Sodium", "D. Chlorine"],
    }
] * 30


# ===== BUILD CONTENT =====
content = []

content.append(NextPageTemplate("secondpageTwoCol"))  # 🔥 KEY FIX

for i, q in enumerate(questions, 1):
    content.append(Paragraph(f"{i}. {q['question']}", question_style))

    for opt in q["options"]:
        content.append(Paragraph(opt, option_style))

    content.append(Spacer(1, 8))


# ===== BUILD PDF =====
doc.build(content)
