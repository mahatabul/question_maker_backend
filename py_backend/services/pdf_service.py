from reportlab.platypus import SimpleDocTemplate, Paragraph
import uuid

def create_pdf(data):
    filename = f"{uuid.uuid4()}.pdf"

    doc = SimpleDocTemplate(filename)
    content = []

    content.append(Paragraph(data.institution))
    content.append(Paragraph(data.subject))

    for i, q in enumerate(data.questions, 1):
        content.append(Paragraph(f"{i}. {q.question}"))

    doc.build(content)

    return filename