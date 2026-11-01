// CSV is readable by Excel without the vulnerable xlsx dependency.
// Escape fields according to RFC 4180 and prevent spreadsheet formula injection.
function safeCsvCell(value) {
  const raw = value == null ? "" : String(value);
  const text = /^[\s\u0000-\u001f]*[=+@-]/u.test(raw) ? "'" + raw : raw;
  return '"' + text.replaceAll('"', '""') + '"';
}

function createCsv(headers, rows) {
  const lines = [
    headers.map(safeCsvCell).join(","),
    ...rows.map((row) => headers.map((header) => safeCsvCell(row[header])).join(",")),
  ];
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

module.exports = { createCsv, safeCsvCell };
