import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";

// Import through CommonJS, as used by the standalone Admin server.
const { convertOfficeFile } = require("../admin-server/office-file-import.js") as {
  convertOfficeFile: (name: string, bytes: Buffer) => Promise<{ importText: string; imageCount: number; warnings: string[] }>;
};

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRGkAAAAASUVORK5CYII=",
  "base64",
);

async function wordFixture(image: Buffer = tinyPng): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><w:body><w:p><w:r><w:t>Câu 1: Hình vẽ biểu diễn gì?</w:t></w:r><w:r><w:drawing><a:blip r:embed="rId5"/></w:drawing></w:r></w:p><w:p><w:r><w:t>A. Đáp án 1</w:t></w:r></w:p><w:p><w:r><w:t>B. Đáp án 2</w:t></w:r></w:p><w:p><w:r><w:t>Đáp án: A</w:t></w:r></w:p></w:body></w:document>',
  );
  zip.file(
    "word/_rels/document.xml.rels",
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId5" Target="media/image1.png" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"/></Relationships>',
  );
  zip.file("word/media/image1.png", image);
  return zip.generateAsync({ type: "nodebuffer" });
}

test("Admin Office importer keeps an image next to its DOCX question", async () => {
  const result = await convertOfficeFile("kiem-tra.docx", await wordFixture());
  assert.equal(result.imageCount, 1);
  assert.deepEqual(result.warnings, []);
  assert.match(result.importText, /Câu 1: Hình vẽ biểu diễn gì\?/);
  assert.match(result.importText, /!\[Hình minh họa\]\(data:image\/png;base64,/);
  assert.match(result.importText, /A\. Đáp án 1/);
});

test("Admin Office importer warns when an embedded image exceeds safe size", async () => {
  const image = Buffer.concat([tinyPng, Buffer.alloc(246_000)]);
  const result = await convertOfficeFile("kiem-tra.docx", await wordFixture(image));
  assert.equal(result.imageCount, 0);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /245 KB/);
});

test("Admin Office importer does not pretend PDF diagrams were imported", async () => {
  await assert.rejects(() => convertOfficeFile("de.pdf", Buffer.from("%PDF-1.7")), /PDF chưa hỗ trợ/);
});
