"use client";

import { useEffect, useMemo, useState } from "react";
import { RichContent } from "@/components/rich-content";
import { isSafeRichImageUrl } from "@/lib/rich-image-security";

type QuestionKind = "SINGLE_CHOICE" | "TRUE_FALSE_SET" | "SHORT_ANSWER" | "ESSAY";
type SourceImage = { alt: string; src: string; withoutImage: string };

function findSourceImage(prompt: string): SourceImage | null {
  const match = /!\[([^\]\r\n]{0,160})\]\((data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+|\/[^\s)]+)\)/i.exec(prompt);
  if (!match || !isSafeRichImageUrl(match[2])) return null;
  return { alt: match[1], src: match[2], withoutImage: prompt.replace(match[0], "").trim() };
}

/** Source screenshots may highlight the answer in cyan. Neutralise cyan pixels
 *  without erasing the black writing over them. Never show unprocessed
 *  multiple-choice screenshots to a student.
 */
export function isAnswerHighlightPixel(r: number, g: number, b: number): boolean {
  return g >= 90 && b >= 90 && g - r >= 24 && b - r >= 24 && Math.abs(g - b) < 100;
}

function hasScannedQuestionHeader(context: CanvasRenderingContext2D, width: number, height: number): boolean {
  // The supplied HSA question screenshots contain a red "Câu N" heading
  // in the upper-left corner. A plain diagram does not usually contain one.
  const regionWidth = Math.min(220, Math.floor(width / 3));
  const regionHeight = Math.min(55, Math.floor(height / 3));
  const pixels = context.getImageData(0, 0, regionWidth, regionHeight).data;
  let red = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2];
    if (r > 100 && r > 1.45 * g && r > 1.35 * b) red++;
  }
  return red >= 35;
}

function neutralizeAnswerHighlight(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const width = canvas.width;
  const height = canvas.height;
  const start = Math.floor(height * 0.48);
  const pixels = context.getImageData(0, start, width, height - start);
  let matched = 0;
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
    if (isAnswerHighlightPixel(r, g, b)) {
      // A black anti-aliased glyph on a cyan highlight stays a dark grey glyph.
      const shade = Math.max(g, b);
      pixels.data[i] = shade;
      pixels.data[i + 1] = shade;
      pixels.data[i + 2] = shade;
      matched++;
    }
  }
  if (matched) context.putImageData(pixels, 0, start);
  return matched;
}

/**
 * Source HSA Excel contains full-width photographs of whole math questions.
 * PDF-extracted formula text may have lost fractions/superscripts. If a source
 * scan is recognised, display the scan once (with answer highlights removed)
 * rather than showing a second, broken textual transcription.
 *
 * Keep data untouched in the database so admins can fix the transcription
 * with genuine LaTeX without losing source material.
 */
export function ExamMathPrompt({
  prompt, track, position, kind,
}: { prompt: string; track?: string | null; position: number; kind: QuestionKind }) {
  const source = useMemo(() => findSourceImage(prompt), [prompt]);
  const candidate = track === "HSA" && position <= 50 && Boolean(source);
  const [result, setResult] = useState<{ source: string; value: string; mode: "scan" | "text" | "error" } | null>(null);

  useEffect(() => {
    if (!candidate || !source) return;
    let active = true;
    const picture = new Image();
    picture.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = picture.naturalWidth;
        canvas.height = picture.naturalHeight;
        if (canvas.width < 500 || canvas.height < 70 || canvas.width > 5000 || canvas.height > 5000) {
          setResult({ source: source.src, value: "", mode: "text" });
          return;
        }
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas unavailable");
        context.drawImage(picture, 0, 0);

        const looksLikeScannedQuestion = hasScannedQuestionHeader(context, canvas.width, canvas.height);
        const highlighted = kind === "SINGLE_CHOICE" ? neutralizeAnswerHighlight(canvas, context) : 0;
        const explicitlyScanned = /ảnh đề gốc|full question|câu hỏi gốc/i.test(source.alt);
        const damagedText = /[\uF000-\uF8FF]/.test(source.withoutImage) ||
          (source.withoutImage.match(/\n/g)?.length ?? 0) >= 3;
        const trustedScan = looksLikeScannedQuestion || explicitlyScanned ||
          highlighted >= 100 || (kind === "SHORT_ANSWER" && damagedText);
        if (!trustedScan) {
          setResult({ source: source.src, value: "", mode: "text" });
          return;
        }
        // All sample HSA multiple-choice scans have a marked answer; a scan
        // without a detectable mark must not replace a valid typed question.
        const safeImage = kind === "SINGLE_CHOICE"
          ? canvas.toDataURL("image/webp", 0.92)
          : source.src;
        setResult({ source: source.src, value: safeImage, mode: "scan" });
      } catch {
        // Do not display the original screenshot as it might expose the key.
        setResult({ source: source.src, value: "", mode: "error" });
      }
    };
    picture.onerror = () => {
      if (active) setResult({ source: source.src, value: "", mode: "error" });
    };
    picture.src = source.src;
    return () => { active = false; picture.onload = null; picture.onerror = null; };
  }, [candidate, source, kind]);

  if (!candidate || !source || result?.mode === "text") {
    return <RichContent value={prompt} className="min-w-0 flex-1 text-lg font-semibold leading-8 text-slate-800" />;
  }

  if (!result || result.source !== source.src) {
    return <div role="status" className="min-w-0 flex-1 text-sm text-slate-500">Đang xử lý ảnh công thức…</div>;
  }

  if (result.mode === "error") {
    return (
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-amber-700">Không xử lý được ảnh gốc an toàn. Báo quản trị kiểm tra câu hỏi này.</p>
        <RichContent value={source.withoutImage} className="mt-2 text-base text-slate-800" />
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <img
        src={result.value}
        alt="Ảnh gốc câu hỏi Toán, đã loại bỏ phần tô nổi đáp án"
        className="max-h-none w-full max-w-[850px] rounded-xl border border-slate-200 bg-white object-contain"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <p className="mt-2 text-xs font-medium text-slate-500">Công thức được giữ theo ảnh đề gốc. Chọn đáp án ở các ô bên dưới.</p>
    </div>
  );
}
