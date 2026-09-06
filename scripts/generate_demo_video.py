from pathlib import Path
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "materials" / "vecto-demo.mp4"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
WIDTH, HEIGHT = 1280, 720


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def base_slide(kicker, title, subtitle):
    image = Image.new("RGB", (WIDTH, HEIGHT), "#061b18")
    draw = ImageDraw.Draw(image)
    for y in range(HEIGHT):
        blend = y / HEIGHT
        color = (
            int(6 + 3 * blend),
            int(27 + 39 * blend),
            int(24 + 34 * blend),
        )
        draw.line((0, y, WIDTH, y), fill=color)
    draw.rounded_rectangle((70, 48, 370, 94), radius=22, fill="#10b981")
    draw.text((92, 59), kicker, font=font(20, True), fill="white")
    draw.text((70, 128), title, font=font(45, True), fill="#ecfdf5")
    draw.text((72, 190), subtitle, font=font(23), fill="#a7f3d0")
    draw.text((70, 660), "AI LEARNING HUB  |  DỮ LIỆU MINH HỌA", font=font(17, True), fill="#6ee7b7")
    return image, draw


def arrow(draw, start, end, color="#34d399", width=8):
    draw.line((*start, *end), fill=color, width=width)
    x1, y1 = start
    x2, y2 = end
    if abs(x2 - x1) >= abs(y2 - y1):
        direction = 1 if x2 > x1 else -1
        points = [(x2, y2), (x2 - 24 * direction, y2 - 15), (x2 - 24 * direction, y2 + 15)]
    else:
        direction = 1 if y2 > y1 else -1
        points = [(x2, y2), (x2 - 15, y2 - 24 * direction), (x2 + 15, y2 - 24 * direction)]
    draw.polygon(points, fill=color)


def point(draw, position, label):
    x, y = position
    draw.ellipse((x - 11, y - 11, x + 11, y + 11), fill="#f8fafc")
    draw.text((x - 12, y + 24), label, font=font(24, True), fill="#f8fafc")


def create_slides(directory):
    slides = []

    image, draw = base_slide("VECTƠ LỚP 10", "Tư duy bằng hướng và độ dài", "Ôn nhanh các quy tắc nền tảng trong 24 giây")
    draw.rounded_rectangle((165, 300, 1115, 555), radius=32, fill="#0f2f2a", outline="#1f6f5e", width=3)
    arrow(draw, (310, 425), (950, 425), width=13)
    point(draw, (310, 425), "A")
    point(draw, (950, 425), "B")
    draw.text((505, 350), "Vectơ AB", font=font(42, True), fill="#6ee7b7")
    slides.append(image)

    image, draw = base_slide("QUY TẮC BA ĐIỂM", "AB + BC = AC", "Điểm cuối của vectơ trước là điểm đầu của vectơ sau")
    positions = [(230, 430), (640, 320), (1040, 470)]
    arrow(draw, positions[0], positions[1], "#34d399")
    arrow(draw, positions[1], positions[2], "#38bdf8")
    arrow(draw, (230, 470), (1040, 510), "#fbbf24", 6)
    for position, label in zip(positions, ["A", "B", "C"]):
        point(draw, position, label)
    draw.text((325, 330), "AB", font=font(26, True), fill="#6ee7b7")
    draw.text((820, 350), "BC", font=font(26, True), fill="#7dd3fc")
    draw.text((590, 520), "AC", font=font(26, True), fill="#fde68a")
    slides.append(image)

    image, draw = base_slide("HÌNH BÌNH HÀNH", "AB + AD = AC", "Hai cạnh xuất phát từ A tạo thành đường chéo AC")
    a, b, c, d = (300, 500), (740, 500), (980, 300), (540, 300)
    draw.line((*a, *b, *c, *d, *a), fill="#475569", width=5, joint="curve")
    arrow(draw, a, b, "#34d399")
    arrow(draw, a, d, "#38bdf8")
    arrow(draw, a, c, "#fbbf24", 7)
    for position, label in [(a, "A"), (b, "B"), (c, "C"), (d, "D")]:
        point(draw, position, label)
    slides.append(image)

    image, draw = base_slide("MẸO TRÁNH MẤT ĐIỂM", "Vectơ khác độ dài vectơ", "AB có hướng, còn |AB| là một số không âm")
    tips = [
        "Đổi thứ tự điểm: AB = -BA",
        "Vectơ-không có độ dài bằng 0",
        "Kiểm tra hướng trước khi cộng vectơ",
    ]
    for index, tip in enumerate(tips):
        top = 295 + index * 90
        draw.rounded_rectangle((185, top, 1095, top + 62), radius=18, fill="#0f2f2a", outline="#1f6f5e", width=2)
        draw.ellipse((215, top + 18, 241, top + 44), fill="#10b981")
        draw.text((270, top + 14), tip, font=font(26, index == 0), fill="#e2e8f0")
    slides.append(image)

    paths = []
    for index, slide in enumerate(slides, start=1):
        path = directory / f"slide-{index}.png"
        slide.save(path, optimize=True)
        paths.append(path)
    return paths


def build_video():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temp_dir:
        directory = Path(temp_dir)
        slides = create_slides(directory)
        concat_file = directory / "slides.txt"
        lines = []
        for slide in slides:
            lines.extend([f"file '{slide}'", "duration 6"])
        lines.append(f"file '{slides[-1]}'")
        concat_file.write_text("\n".join(lines), encoding="utf-8")
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "concat", "-safe", "0", "-i", str(concat_file),
            "-vf", "fps=24,format=yuv420p",
            "-c:v", "libx264", "-preset", "medium", "-crf", "23",
            "-movflags", "+faststart", "-an", str(OUTPUT),
        ], check=True)


if __name__ == "__main__":
    build_video()
