import { describe, it } from "node:test";
import assert from "node:assert/strict";
const { validateDocumentBuffer, InvalidDocumentError } = require("../src/lib/document-file-validation.js");

function fakeOfficeZip(parts: Array<[string, Buffer]>) {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [filename, data] of parts) {
    const name = Buffer.from(filename, "utf8");
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0);
    l.writeUInt16LE(20, 4);
    l.writeUInt32LE(data.length, 18);
    l.writeUInt32LE(data.length, 22);
    l.writeUInt16LE(name.length, 26);
    local.push(l, name, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, name);
    offset += l.length + name.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(parts.length, 8);
  end.writeUInt16LE(parts.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, end]);
}
function officeDoc(type: "docx" | "pptx", extra: Array<[string, Buffer]> = []) {
  const isWord = type === "docx";
  const mime = isWord ? "wordprocessingml.document.main+xml" : "presentationml.presentation.main+xml";
  return fakeOfficeZip([
    ["[Content_Types].xml", Buffer.from("<Types>" + mime + "</Types>")],
    [isWord ? "word/document.xml" : "ppt/presentation.xml", Buffer.from("<document/>")],
    ...extra,
  ]);
}

describe("document upload byte validation", () => {
  it("allows a real PDF signature and rejects PDF executable/renamed uploads", () => {
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
    assert.equal(validateDocumentBuffer(pdf, "lesson.pdf").mimeType, "application/pdf");
    assert.throws(() => validateDocumentBuffer(Buffer.from("MZ\\0payload%%EOF"), "lesson.pdf"), InvalidDocumentError);
    assert.throws(() => validateDocumentBuffer(pdf, "lesson.docx"), InvalidDocumentError);
    assert.throws(() => validateDocumentBuffer(pdf, "lesson.pdf", "image/png"), InvalidDocumentError);
  });
  it("checks real DOCX and PPTX archive structures", () => {
    assert.equal(validateDocumentBuffer(officeDoc("docx"), "notes.docx").extension, ".docx");
    assert.equal(validateDocumentBuffer(officeDoc("pptx"), "lecture.pptx").extension, ".pptx");
    assert.throws(() => validateDocumentBuffer(officeDoc("docx"), "slides.pptx"), InvalidDocumentError);
  });
  it("rejects ZIP path traversal, macro payloads and duplicated filenames", () => {
    assert.throws(() => validateDocumentBuffer(officeDoc("docx", [["../evil.sh", Buffer.from("evil")]]), "a.docx"));
    assert.throws(() => validateDocumentBuffer(officeDoc("docx", [["word/vbaProject.bin", Buffer.from("macro")]]), "a.docx"));
    assert.throws(() => validateDocumentBuffer(officeDoc("docx", [["word/document.xml", Buffer.from("duplicate")]]), "a.docx"));
  });
  it("rejects deceptively compressed ZIP entries and missing end markers", () => {
    const doc = officeDoc("docx");
    // Tamper with central uncompressed size to exceed the allowed ratio.
    const buffer = Buffer.from(doc);
    const central = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    buffer.writeUInt32LE(60_000_000, central + 24);
    assert.throws(() => validateDocumentBuffer(buffer, "large.docx"), InvalidDocumentError);
    assert.throws(() => validateDocumentBuffer(Buffer.from("%PDF-1.5\n"), "a.pdf"), InvalidDocumentError);
  });
});
