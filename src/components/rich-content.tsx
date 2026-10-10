import katex from "katex";
import { clsx } from "clsx";

type RichPart =
  | { type: "text"; value: string }
  | { type: "image"; alt: string; src: string }
  | { type: "math"; value: string; display: boolean };

function isRenderableImageUrl(url: string) {
  return /^(https?:\/\/|data:image\/|\/)/i.test(url.trim());
}

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
      if (isRenderableImageUrl(src)) parts.push({ type: "image", alt: match[1] || "Hình minh họa", src });
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

        return <span key={partIndex} className="whitespace-pre-wrap">{part.value}</span>;
      })}
    </div>
  );
}
