import katex from "katex";
import { clsx } from "clsx";
import { isSafeRichImageUrl } from "@/lib/rich-image-security";

type RichPart =
  | { type: "text"; value: string }
  | { type: "image"; alt: string; src: string }
  | { type: "math"; value: string; display: boolean };

function renderMath(value: string, displayMode: boolean) {
  try {
    return katex.renderToString(value, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch {
    return null;
  }
}

function parseRichContent(value: string) {
  const parts: RichPart[] = [];
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    const text = value.slice(cursor, match.index);
    if (text) parts.push({ type: "text", value: text });

    if (match[2]) {
      const src = match[2].trim();
      if (isSafeRichImageUrl(src)) parts.push({ type: "image", alt: match[1] || "Hình minh họa", src });
      else parts.push({ type: "text", value: match[0] });
    } else if (match[3]) {
      parts.push({ type: "math", value: match[3].trim(), display: true });
    } else if (match[4]) {
      parts.push({ type: "math", value: match[4].trim(), display: false });
    }

    cursor = match.index + match[0].length;
  }

  const rest = value.slice(cursor);
  if (rest) parts.push({ type: "text", value: rest });
  return parts;
}

/** Render simple safe inline formatting used by English passages and questions.
 * Only text nodes are emitted: never treat imported markup as trusted HTML.
 */
function formattedText(value: string) {
  const token = /(\*\*[^*\n]+\*\*|__[^_\n]+__|<u>[^<\n]+<\/u>|\*[^*\n]+\*|_[^_\n]+_)/g;
  return value.split(token).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("__") && part.endsWith("__")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("<u>") && part.endsWith("</u>")) return <u key={index}>{part.slice(3, -4)}</u>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("_") && part.endsWith("_")) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function RichContent({ value, className = "", imageClassName = "" }: { value: string; className?: string; imageClassName?: string }) {
  const parts = parseRichContent(value);

  return (
    <div className={className}>
      {parts.map((part, partIndex) => {
        if (part.type === "image") {
          return (
            <img
              key={`${part.src}-${partIndex}`}
              src={part.src}
              alt={part.alt}
              loading="lazy"
              referrerPolicy="no-referrer"
              className={clsx("mt-2 max-h-[360px] max-w-full rounded-2xl border border-slate-200 bg-slate-50 object-contain", imageClassName)}
            />
          );
        }

        if (part.type === "math") {
          const html = renderMath(part.value, part.display);
          if (!html) return <span key={partIndex}>{part.display ? `$$${part.value}$$` : `$${part.value}$`}</span>;
          return part.display ? (
            <div key={partIndex} className="my-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <span key={partIndex} className="inline-block align-middle" dangerouslySetInnerHTML={{ __html: html }} />
          );
        }

        return <span key={partIndex} className="whitespace-pre-wrap">{formattedText(part.value)}</span>;
      })}
    </div>
  );
}
