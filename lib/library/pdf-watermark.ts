import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

export async function watermarkPdfBuffer(input: {
  bytes: Uint8Array | Buffer;
  label: string;
  licenceText?: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(input.bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const label = input.label.slice(0, 180);
  const licence = (input.licenceText || "").slice(0, 160);

  for (const page of pages) {
    const { width, height } = page.getSize();
    const size = Math.max(10, Math.min(18, width / 40));
    page.drawText(label, {
      x: width * 0.12,
      y: height * 0.35,
      size,
      font,
      color: rgb(0.15, 0.15, 0.15),
      opacity: 0.18,
      rotate: degrees(32),
    });
    page.drawText(label, {
      x: 24,
      y: 18,
      size: 8,
      font,
      color: rgb(0.25, 0.25, 0.25),
      opacity: 0.55,
    });
    if (licence) {
      page.drawText(licence, {
        x: 24,
        y: 8,
        size: 7,
        font,
        color: rgb(0.3, 0.3, 0.3),
        opacity: 0.5,
      });
    }
  }

  return pdf.save({ useObjectStreams: false });
}

export function isPdfFile(fileType?: string | null, fileName?: string | null) {
  const type = String(fileType ?? "").toLowerCase();
  const name = String(fileName ?? "").toLowerCase();
  return type === "pdf" || name.endsWith(".pdf") || type.includes("pdf");
}
