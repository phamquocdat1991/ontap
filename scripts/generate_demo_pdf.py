from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "materials" / "vecto-demo.pdf"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def add_page_frame(canvas, document):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#064e3b"))
    canvas.rect(0, height - 18 * mm, width, 18 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("DejaVuSans-Bold", 8.5)
    canvas.drawCentredString(width / 2, height - 11.5 * mm, "AI LEARNING HUB  |  GDPT 2018")
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.setFont("DejaVuSans", 8)
    canvas.drawString(18 * mm, 9 * mm, "AI Learning Hub - Tai lieu demo tong hop")
    canvas.drawRightString(width - 18 * mm, 9 * mm, f"Trang {document.page}")
    canvas.restoreState()


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(TTFont("DejaVuSans", FONT_REGULAR))
    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", FONT_BOLD))

    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=24 * mm,
        bottomMargin=14 * mm,
        title="Chuyên đề Vectơ lớp 10 - Tài liệu demo",
        author="AI Learning Hub",
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="TitleVN",
        parent=styles["Title"],
        fontName="DejaVuSans-Bold",
        fontSize=20,
        leading=24,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#064e3b"),
        spaceAfter=5 * mm,
    ))
    styles.add(ParagraphStyle(
        name="HeadingVN",
        parent=styles["Heading2"],
        fontName="DejaVuSans-Bold",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#047857"),
        spaceBefore=3 * mm,
        spaceAfter=1.5 * mm,
    ))
    styles.add(ParagraphStyle(
        name="BodyVN",
        parent=styles["BodyText"],
        fontName="DejaVuSans",
        fontSize=9.6,
        leading=14,
        textColor=colors.HexColor("#1f2937"),
        spaceAfter=1.5 * mm,
    ))
    styles.add(ParagraphStyle(
        name="NoteVN",
        parent=styles["BodyText"],
        fontName="DejaVuSans",
        fontSize=8.2,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#475569"),
        backColor=colors.HexColor("#f1f5f9"),
        borderPadding=6,
        spaceAfter=5 * mm,
    ))

    story = [
        Paragraph("CHUYÊN ĐỀ VECTƠ LỚP 10", styles["TitleVN"]),
        Paragraph(
            "TÀI LIỆU MINH HỌA - Nội dung tổng hợp phục vụ kiểm thử học liệu, không thay thế sách giáo khoa hoặc hướng dẫn của giáo viên.",
            styles["NoteVN"],
        ),
        Paragraph("1. Mục tiêu học tập", styles["HeadingVN"]),
        Paragraph("- Nhận biết vectơ, vectơ-không, hai vectơ cùng phương và độ dài vectơ.", styles["BodyVN"]),
        Paragraph("- Vận dụng quy tắc ba điểm và quy tắc hình bình hành để cộng, trừ vectơ.", styles["BodyVN"]),
        Paragraph("- Biểu diễn bài toán hình học bằng đẳng thức vectơ và kiểm tra tính hợp lí của kết quả.", styles["BodyVN"]),
        Paragraph("2. Kiến thức cốt lõi", styles["HeadingVN"]),
    ]

    knowledge = [
        [Paragraph("Nội dung", styles["BodyVN"]), Paragraph("Ghi nhớ", styles["BodyVN"])],
        [Paragraph("Vectơ", styles["BodyVN"]), Paragraph("Đoạn thẳng có hướng, xác định bởi điểm đầu và điểm cuối.", styles["BodyVN"])],
        [Paragraph("Độ dài", styles["BodyVN"]), Paragraph("Độ dài vectơ AB bằng độ dài đoạn thẳng AB và luôn không âm.", styles["BodyVN"])],
        [Paragraph("Vectơ-không", styles["BodyVN"]), Paragraph("Có điểm đầu trùng điểm cuối và độ dài bằng 0.", styles["BodyVN"])],
        [Paragraph("Hai vectơ bằng nhau", styles["BodyVN"]), Paragraph("Cùng hướng và cùng độ dài.", styles["BodyVN"])],
    ]
    table = Table(knowledge, colWidths=[45 * mm, 105 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#d1fae5")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#064e3b")),
        ("FONTNAME", (0, 0), (-1, 0), "DejaVuSans-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#a7f3d0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.extend([
        table,
        Paragraph("3. Công thức và quy tắc", styles["HeadingVN"]),
        Paragraph("Quy tắc ba điểm: AB + BC = AC.", styles["BodyVN"]),
        Paragraph("Quy tắc hình bình hành ABCD: AB + AD = AC.", styles["BodyVN"]),
        Paragraph("Hiệu hai vectơ: AB - AC = CB.", styles["BodyVN"]),
        KeepTogether([
            Paragraph("4. Ví dụ", styles["HeadingVN"]),
            Paragraph("Cho tam giác ABC và điểm M. Chứng minh MA + AB = MB.", styles["BodyVN"]),
            Paragraph("Lời giải: Đi từ M đến A, sau đó từ A đến B tương đương đi trực tiếp từ M đến B. Theo quy tắc ba điểm, MA + AB = MB.", styles["BodyVN"]),
        ]),
        Paragraph("5. Lỗi thường gặp", styles["HeadingVN"]),
        Paragraph("- Đổi thứ tự điểm làm đổi hướng vectơ: AB = -BA.", styles["BodyVN"]),
        Paragraph("- Nhầm vectơ với độ dài: AB là vectơ, còn |AB| là một số không âm.", styles["BodyVN"]),
        Paragraph("- Áp dụng quy tắc ba điểm khi điểm cuối của vectơ thứ nhất không trùng điểm đầu của vectơ thứ hai.", styles["BodyVN"]),
        Paragraph("Tự kiểm tra: Trong hình bình hành ABCD, hãy giải thích vì sao AB + AD = AC bằng cả hình học và quy tắc ba điểm.", styles["NoteVN"]),
    ])

    document.build(story, onFirstPage=add_page_frame, onLaterPages=add_page_frame)


if __name__ == "__main__":
    build_pdf()
