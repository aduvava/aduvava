// Student/teacher-authored Markdown cannot silently contact arbitrary
// third-party tracking servers when another student opens an exam.
// Use uploaded/local assets rather than external image URLs.
export function isSafeRichImageUrl(raw: string): boolean {
  const src = raw.trim();
  if (!src.startsWith("/") || src.startsWith("//") || src.startsWith("/\\") || src.length > 2048) return false;
  if (/[\\\u0000-\u001f\u007f]/.test(src)) return false;
  try {
    const parsed = new URL(src, "https://eduva.invalid");
    return parsed.origin === "https://eduva.invalid";
  } catch {
    return false;
  }
}
