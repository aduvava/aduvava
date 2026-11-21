import katex from "katex";

/**
 * Validate mathematical expressions explicitly delimited as LaTeX.
 * Never reconstruct an unreadable PDF formula by guessing from damaged text.
 */
export function latexErrors(value: string): string[] {
  const expressions = /\$\$([\s\S]*?)\$\$|\$([^$\n]*?)\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  const errors: string[] = [];
  for (const match of value.matchAll(expressions)) {
    const source = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? "").trim();
    if (!source) {
      errors.push("Công thức LaTeX trống.");
      continue;
    }
    try {
      katex.renderToString(source, { throwOnError: true, strict: false, trust: false });
    } catch (error) {
      errors.push(error instanceof Error ? error.message.slice(0, 180) : "Công thức LaTeX không hợp lệ.");
    }
    if (errors.length >= 8) break;
  }
  return errors;
}

export function withExplicitLatex(prompt: string, rawLatex: string): string {
  const expression = rawLatex.trim();
  if (!expression) return prompt;
  const wrapped = /^(?:\$\$|\\\[|\\\(|\$)/.test(expression)
    ? expression
    : "$$" + expression + "$$";
  return [prompt.trim(), wrapped].filter(Boolean).join("\n\n");
}

export function hasCorruptedPdfMath(text: string): boolean {
  return /[\uF000-\uF8FF]/.test(text);
}
