from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    NextPageTemplate,
    Flowable,
)
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
import uuid
import re


# ================= MCQ OPTION (CIRCLE + TEXT) =================
class MCQOption(Flowable):
    """
    Renders a single MCQ option: a lettered circle followed by shaped Bangla text.
    Text is rendered via a Paragraph (with shaping=1) so Bengali conjuncts/ligatures
    are correctly formed by HarfBuzz before hitting the PDF stream.
    """

    def __init__(self, letter, text, font="Bangla", font_size=9):
        super().__init__()
        self.letter = letter
        self.text = text
        self.font = font
        self.font_size = font_size

        self.circle_radius = 6
        self.v_padding = 3    # vertical padding above/below circle
        self.gap = 6          # gap between circle right edge and text

        # Build the inner Paragraph for shaped text rendering
        self._style = ParagraphStyle(
            f"MCQOpt_{letter}",
            fontName=font,
            fontSize=font_size,
            leading=font_size * 1.3,
            shaping=1,          # ← KEY: enables HarfBuzz shaping
        )
        self._para = Paragraph(text, self._style)

    def wrap(self, availWidth, availHeight):
        self.width = availWidth

        # Space used by circle column
        circle_col = self.circle_radius * 2 + self.gap

        # Let the paragraph wrap within the remaining width
        para_w = max(availWidth - circle_col, 10)
        pw, ph = self._para.wrap(para_w, availHeight)

        # Row height = taller of circle diameter or paragraph height, plus padding
        self.height = max(self.circle_radius * 2, ph) + self.v_padding * 2
        self._para_height = ph
        self._para_width = para_w
        return self.width, self.height

    def draw(self):
        c = self.canv

        # Vertical centre of the row
        cy = self.height / 2

        # ── Circle ──────────────────────────────────────────────
        c.circle(self.circle_radius, cy, self.circle_radius)

        # Letter inside circle
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(self.circle_radius, cy - 2.5, self.letter)

        # ── Shaped option text via Paragraph ────────────────────
        text_x = self.circle_radius * 2 + self.gap
        # Align paragraph baseline with circle centre
        text_y = cy - self._para_height / 2
        c.saveState()
        c.translate(text_x, text_y)
        self._para.drawOn(c, 0, 0)
        c.restoreState()


# ================= MAIN FUNCTION =================
def create_pdf(data):
    # Register Bangla font (NotoSansBengali supports full Bengali unicode + HarfBuzz)
    pdfmetrics.registerFont(TTFont("Bangla", "NotoSansBengali-Regular.ttf"))

    filename = f"{uuid.uuid4()}.pdf"
    doc = BaseDocTemplate(filename, pagesize=A4)

    HEADER_HEIGHT = 100

    # ===== DATA =====
    institution = data["institution"]
    subject = data["subject"]
    questions = data["questions"]

    total_q = len(questions)
    time_val = total_q
    marks = total_q

    page_width, page_height = A4
    col_width = (doc.width / 2) - 10   # each column with 10pt inner gap

     # ── Helper: draw one shaped line at exact (x, y) bottom-left origin ────────
    def _draw_shaped(canvas, text, font_size, x, y):
        """
        Render a single shaped line.  (x, y) is the bottom-left of the text box.
        pdfmetrics.stringWidth gives the true text width so the Paragraph box is
        sized to fit exactly — no internal wrapping or alignment distortion.
        """
        style = ParagraphStyle(
            "_hdr_shaped",
            fontName="Bangla",
            fontSize=font_size,
            leading=font_size * 1.2,
            shaping=1,
        )
        tw = pdfmetrics.stringWidth(text, "Bangla", font_size)
        para = Paragraph(text, style)
        _pw, ph = para.wrap(tw + 2, 999)   # +2 pt slack prevents accidental wrap
        para.drawOn(canvas, x, y - ph)
 
    # ================= HEADER (page 1 only) =================
    def draw_header(canvas, doc):
        canvas.saveState()
        width, height = doc.pagesize
 
        # ── Institution name — centred ────────────────────────────
        tw = pdfmetrics.stringWidth(institution, "Bangla", 14)
        _draw_shaped(canvas, institution, 14, width / 2 - tw / 2, height - 30)
 
        # ── Subject — centred ─────────────────────────────────────
        subject_text = f"Subject: {subject}"
        tw = pdfmetrics.stringWidth(subject_text, "Bangla", 12)
        _draw_shaped(canvas, subject_text, 12, width / 2 - tw / 2, height - 52)
 
        # ── Time — left-aligned at left margin ───────────────────
        _draw_shaped(canvas, f"Time: {time_val} min", 10, doc.leftMargin, height - 72)
 
        # ── Full Marks — right-aligned at right margin ───────────
        marks_text = f"Full Marks: {marks}"
        tw = pdfmetrics.stringWidth(marks_text, "Bangla", 10)
        _draw_shaped(canvas, marks_text, 10, width - doc.rightMargin - tw, height - 72)
 
        # Header bottom rule
        canvas.line(
            doc.leftMargin,
            height - HEADER_HEIGHT,
            width - doc.rightMargin,
            height - HEADER_HEIGHT,
        )
 
        # Vertical centre divider
        canvas.line(width / 2, doc.bottomMargin, width / 2, height - HEADER_HEIGHT)
 
        canvas.restoreState()

    # ================= LATER PAGE DIVIDER =================
    def draw_line(canvas, doc):
        canvas.saveState()
        width, height = doc.pagesize
        canvas.line(width / 2, doc.bottomMargin, width / 2, height - doc.topMargin)
        canvas.restoreState()

    # ================= FRAMES =================
    left_x = doc.leftMargin
    right_x = doc.leftMargin + doc.width / 2 + 10

    frame1_first = Frame(
        left_x, doc.bottomMargin, col_width, doc.height - 50,
        id="col1_first", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )
    frame2_first = Frame(
        right_x, doc.bottomMargin, col_width, doc.height - 50,
        id="col2_first", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )
    frame1_later = Frame(
        left_x, doc.bottomMargin, col_width, doc.height,
        id="col1_later", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )
    frame2_later = Frame(
        right_x, doc.bottomMargin, col_width, doc.height,
        id="col2_later", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )

    # ================= PAGE TEMPLATES =================
    doc.addPageTemplates([
        PageTemplate(id="firstpage",  frames=[frame1_first, frame2_first], onPage=draw_header),
        PageTemplate(id="laterpage",  frames=[frame1_later, frame2_later], onPage=draw_line),
    ])

    # ================= STYLES =================
    # shaping=1 tells ReportLab to run HarfBuzz before laying out glyphs —
    # this is what fixes the scrambled Bengali rendering.
    question_style = ParagraphStyle(
        "Question",
        fontName="Bangla",
        fontSize=10,
        leading=14,
        spaceAfter=4,
        spaceBefore=4,
        shaping=1,          # ← fixes encoding / scramble issue
    )

    # ================= BUILD CONTENT =================
    content = [NextPageTemplate("laterpage")]
    letters = ["A", "B", "C", "D"]

    for i, q in enumerate(questions, 1):
        content.append(Paragraph(f"{i}. {q['question']}", question_style))

        for j, opt in enumerate(q["options"]):
            text = re.sub(r"^[A-D]\.\s*", "", opt)
            content.append(MCQOption(letters[j], text))

        content.append(Spacer(1, 8))

    doc.build(content)
    return filename
