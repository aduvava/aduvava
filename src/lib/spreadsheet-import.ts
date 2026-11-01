const MAX_ROWS = 2000;
const MAX_COLUMNS = 60;

// The first row contains column names, like "question", "A", "B", "correct".
export function rowsToObjects(rows: readonly (readonly unknown[])[]): Array<Record<string, unknown>> {
  if (!rows.length) return [];
  if (rows.length > MAX_ROWS + 1) throw new Error("Spreadsheet row limit exceeded");
  const names = rows[0].map((cell) => String(cell ?? "").trim().slice(0, 120));
  if (names.length > MAX_COLUMNS) throw new Error("Spreadsheet column limit exceeded");
  return rows.slice(1).map((row) => {
    const record: Record<string, unknown> = {};
    for (let index = 0; index < names.length; index++) {
      if (names[index]) record[names[index]] = row[index] ?? "";
    }
    return record;
  });
}

// RFC 4180 quoting, with optional tabs for TSV. Avoid regex split on newlines:
// questions and explanations can contain quoted line breaks.
export function parseDelimited(text: string, separator: "," | "\t" = ","): string[][] {
  if (text.length > 2_000_000) throw new Error("Spreadsheet text too large");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = text.charCodeAt(0) === 0xFEFF ? 1 : 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else if (field.length === 0 || quoted) { quoted = !quoted; }
      else { field += ch; }
    } else if (!quoted && (ch === separator || ch === "\r" || ch === "\n")) {
      row.push(field);
      field = "";
      if (ch !== separator) {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        rows.push(row);
        row = [];
        if (rows.length > MAX_ROWS + 1) throw new Error("Spreadsheet row limit exceeded");
      }
    } else {
      field += ch;
    }
  }
  if (quoted) throw new Error("Unterminated CSV quoted field");
  if (field || row.length) { row.push(field); rows.push(row); }
  if (rows[0]?.[0]?.startsWith("\uFEFF")) rows[0][0] = rows[0][0].slice(1);
  if (rows.some((cells) => cells.length > MAX_COLUMNS)) throw new Error("Spreadsheet column limit exceeded");
  return rows;
}
