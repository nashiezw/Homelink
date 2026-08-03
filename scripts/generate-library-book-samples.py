from pathlib import Path

from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
TMP_DIR = ROOT / "tmp" / "pdfs"

BOOKS = [
    {
        "title": "The Complete Guide to Property Development and Property Law in Zimbabwe",
        "source_pdf": OUTPUT_DIR
        / "PROPERTY DEVELOPMENT AND PROPERTY LAW IN ZIMBABWE - HouseLink watermarked compact read-only.pdf",
        "cover_image": ROOT / "public" / "images" / "library" / "property-development-law-cover.png",
        "sample_pdf": OUTPUT_DIR
        / "PROPERTY DEVELOPMENT AND PROPERTY LAW IN ZIMBABWE - HouseLink sample preview.pdf",
        "source_start_page": 1,
        "pages_from_source": 9,
    },
    {
        "title": "HouseLink Zimbabwe Real Estate Agent Training Manual",
        "source_pdf": ROOT
        / "public"
        / "uploads"
        / "academy"
        / "houselink-zimbabwe-real-estate-agent-training-manual.pdf",
        "cover_image": ROOT / "public" / "images" / "academy" / "agent-academy-hero.png",
        "sample_pdf": OUTPUT_DIR
        / "HouseLink Zimbabwe Real Estate Agent Training Manual - sample preview.pdf",
        "source_start_page": 2,
        "pages_from_source": 9,
    }
]


def optimized_cover_image(source: Path) -> Path:
    output = TMP_DIR / f"{source.stem}-sample-cover.jpg"
    with Image.open(source) as image:
        image.thumbnail((1400, 1400), Image.Resampling.LANCZOS)
        if image.mode in ("RGBA", "LA"):
            background = Image.new("RGB", image.size, "white")
            background.paste(image, mask=image.getchannel("A"))
            image = background
        else:
            image = image.convert("RGB")
        output.parent.mkdir(parents=True, exist_ok=True)
        image.save(output, "JPEG", quality=82, optimize=True, progressive=True)
    return output


def wrap_text(c: canvas.Canvas, text: str, max_width: float, font_name: str, font_size: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if c.stringWidth(candidate, font_name, font_size) <= max_width:
            current = candidate
            continue
        if current:
            lines.append(current)
        current = word
    if current:
        lines.append(current)
    return lines


def draw_cover_page(book: dict, page_width: float, page_height: float, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(destination), pagesize=(page_width, page_height))

    c.setFillColorRGB(0.965, 0.973, 0.96)
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)

    image = ImageReader(str(optimized_cover_image(book["cover_image"])))
    image_width, image_height = image.getSize()
    max_width = page_width * 0.78
    max_height = page_height * 0.55
    scale = min(max_width / image_width, max_height / image_height)
    draw_width = image_width * scale
    draw_height = image_height * scale
    x = (page_width - draw_width) / 2
    y = page_height - draw_height - (page_height * 0.12)

    c.drawImage(image, x, y, draw_width, draw_height, preserveAspectRatio=True, mask="auto")

    c.setFillColorRGB(0.02, 0.12, 0.28)
    title_lines = wrap_text(c, book["title"], page_width * 0.78, "Helvetica-Bold", 22)
    title_y = y - 42
    c.setFont("Helvetica-Bold", 22)
    for line in title_lines[:4]:
        c.drawCentredString(page_width / 2, title_y, line)
        title_y -= 27

    c.setFillColorRGB(0.02, 0.12, 0.28)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(page_width / 2, title_y - 14, "Sample Preview")
    c.setFont("Helvetica", 10)
    c.setFillColorRGB(0.22, 0.31, 0.42)
    c.drawCentredString(
        page_width / 2,
        title_y - 32,
        "Includes selected opening pages from the HouseLink Zimbabwe library book.",
    )
    c.save()


def generate_sample(book: dict) -> None:
    source = PdfReader(str(book["source_pdf"]))
    if not source.pages:
        raise ValueError(f"Source PDF has no pages: {book['source_pdf']}")

    first_page = source.pages[0]
    page_width = float(first_page.mediabox.width)
    page_height = float(first_page.mediabox.height)

    cover_pdf = TMP_DIR / f"{book['sample_pdf'].stem}-cover.pdf"
    draw_cover_page(book, page_width, page_height, cover_pdf)

    writer = PdfWriter()
    writer.add_page(PdfReader(str(cover_pdf)).pages[0])

    start_index = max(0, int(book.get("source_start_page", 1)) - 1)
    page_count = min(int(book["pages_from_source"]), max(0, len(source.pages) - start_index))
    for page_index in range(start_index, start_index + page_count):
        writer.add_page(source.pages[page_index])

    book["sample_pdf"].parent.mkdir(parents=True, exist_ok=True)
    with book["sample_pdf"].open("wb") as handle:
        writer.write(handle)

    result = PdfReader(str(book["sample_pdf"]))
    expected = page_count + 1
    if len(result.pages) != expected:
        raise ValueError(f"Expected {expected} pages, got {len(result.pages)}")

    print(f"Created {book['sample_pdf']} ({len(result.pages)} pages)")


def main() -> None:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    for book in BOOKS:
        generate_sample(book)


if __name__ == "__main__":
    main()
