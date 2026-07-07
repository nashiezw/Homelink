/** Transforms extracted manual content into readable HTML with paragraphs and headings. */
export function formatLessonContent(input: {
  richText?: string | null;
  transcript?: string | null;
  summary?: string | null;
  title?: string;
}): string {
  const transcript = cleanPlainText(input.transcript);
  const rich = stripHtml(input.richText ?? "");
  const summary = cleanPlainText(input.summary);

  const richLooksBad =
    !rich ||
    rich.length < 40 ||
    (rich.match(/\.{4,}/g)?.length ?? 0) >= 2 ||
    (rich.split(/\.\s+/).length <= 2 && rich.length > 400);

  const source = richLooksBad && transcript.length > rich.length ? transcript : rich || transcript || summary;
  if (!source) return "";

  return plainTextToHtml(source);
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPlainText(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/\.{4,}\s*\d+/g, " ")
    .replace(/[ \t]+\d{2,3}(?=\s|$)/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function plainTextToHtml(text: string) {
  const blocks = text.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  const parts: string[] = [];

  for (const block of blocks.length ? blocks : [text]) {
    if (isHeading(block)) {
      parts.push(`<h3 class="lesson-heading">${escapeHtml(block)}</h3>`);
      continue;
    }
    const sentences = block.split(/(?<=[.!?])\s+(?=[A-Z"'])/).filter(Boolean);
    if (sentences.length <= 1 && block.length > 320) {
      const chunks = chunkSentences(block);
      for (const chunk of chunks) {
        parts.push(`<p>${escapeHtml(chunk)}</p>`);
      }
    } else if (sentences.length > 1) {
      let buffer: string[] = [];
      for (const sentence of sentences) {
        buffer.push(sentence);
        if (buffer.join(" ").length >= 280 || buffer.length >= 3) {
          parts.push(`<p>${escapeHtml(buffer.join(" "))}</p>`);
          buffer = [];
        }
      }
      if (buffer.length) parts.push(`<p>${escapeHtml(buffer.join(" "))}</p>`);
    } else {
      parts.push(`<p>${escapeHtml(block)}</p>`);
    }
  }

  return parts.join("\n");
}

function isHeading(text: string) {
  const trimmed = text.trim();
  if (trimmed.length > 80 || trimmed.length < 4) return false;
  if (/^chapter\s+\d/i.test(trimmed)) return true;
  if (/^section\s+\d/i.test(trimmed)) return true;
  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  if (!letters) return false;
  const upperRatio = (letters.match(/[A-Z]/g)?.length ?? 0) / letters.length;
  return upperRatio > 0.75 && trimmed.split(/\s+/).length <= 12;
}

function chunkSentences(text: string) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let buffer: string[] = [];
  for (const sentence of sentences) {
    buffer.push(sentence);
    if (buffer.join(" ").length >= 260 || buffer.length >= 3) {
      chunks.push(buffer.join(" "));
      buffer = [];
    }
  }
  if (buffer.length) chunks.push(buffer.join(" "));
  return chunks.length ? chunks : [text];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
