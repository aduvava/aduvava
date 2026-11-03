// Prevent third-party tracking pixels while retaining bounded inline raster
// diagrams supplied by teachers. Never allow SVG, remote URLs or unbounded data.
export const MAX_INLINE_RASTER_DATA_URL_LENGTH = 350_000;
export const MAX_EXAM_RICH_FIELD_LENGTH = 450_000;

export function isSafeRichImageUrl(raw: string): boolean {
  const src = raw.trim();
  if (src.length > MAX_INLINE_RASTER_DATA_URL_LENGTH) return false;
  if (/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(src)) return true;
  if (!src.startsWith("/") || src.startsWith("//") || src.startsWith("/\\") || src.length > 2048) return false;
  if (/[\\\u0000-\u001f\u007f]/.test(src)) return false;
  try {
    const parsed = new URL(src, "https://eduva.invalid");
    return parsed.origin === "https://eduva.invalid";
  } catch {
    return false;
  }
}

// Count visible text separately from a self-contained inline raster image.
// The entire field and request still have hard limits to protect memory/DB.
export function fitsExamRichField(value: string, maxVisibleChars: number): boolean {
  if (value.length > MAX_EXAM_RICH_FIELD_LENGTH) return false;
  const withoutSafeImages = value.replace(
    /!\[[^\]\r\n]{0,160}\]\((data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+)\)/gi,
    (markdown, src: string) => isSafeRichImageUrl(src) ? "" : markdown,
  );
  return withoutSafeImages.length <= maxVisibleChars;
}
