"use strict";

const JSZip = require("jszip");
const { DOMParser } = require("@xmldom/xmldom");

const MAX_IMAGE = 245000;
const MAX_SUM = 3000000;

function parseXml(source) {
  const doc = new DOMParser({ errorHandler: { warning() {}, error(message) { throw Error(message); }, fatalError(message) { throw Error(message); } } }).parseFromString(source, "application/xml");
  return doc;
}
function elements(root, name) { return Array.from(root.getElementsByTagNameNS("*", name)); }
function attribute(node, name) {
  if (!node || !node.attributes) return "";
  return Array.from({ length: node.attributes.length }, (_, i) => node.attributes.item(i))
    .find((attr) => attr && attr.localName === name)?.value || "";
}
function relative(base, target) {
  if (!target || /^[a-z]+:/i.test(target)) return null;
  const parts = (target.startsWith("/") ? target.slice(1) : base.slice(0, base.lastIndexOf("/") + 1) + target).split("/");
  const result = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") { if (!result.length) return null; result.pop(); }
    else result.push(part);
  }
  return result.join("/");
}
function relName(part) {
  const pos = part.lastIndexOf("/");
  return part.slice(0, pos + 1) + "_rels/" + part.slice(pos + 1) + ".rels";
}
async function rels(zip, part) {
  const result = new Map();
  const file = zip.file(relName(part));
  if (!file) return result;
  const doc = parseXml(await file.async("string"));
  for (const rel of elements(doc, "Relationship")) {
    if (rel.getAttribute("TargetMode") === "External") continue;
    const key = rel.getAttribute("Id");
    const path = relative(part, rel.getAttribute("Target"));
    if (key && path) result.set(key, path);
  }
  return result;
}
function mime(path) {
  const extension = String(path).toLowerCase().split(".").pop();
  return ({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" })[extension];
}
function looksValid(buffer, kind) {
  if (kind === "image/png") return buffer[0] === 137 && buffer[1] === 80;
  if (kind === "image/jpeg") return buffer[0] === 255 && buffer[1] === 216;
  if (kind === "image/gif") return buffer.subarray(0, 3).toString() === "GIF";
  if (kind === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  return false;
}
function collector(zip, warnings) {
  let count = 0;
  let sum = 0;
  const cache = new Map();
  return {
    async read(path) {
      if (cache.has(path)) return cache.get(path);
      const entry = zip.file(path);
      const type = mime(path);
      if (!entry || !type) { warnings.push("Tệp ảnh bị thiếu/không hỗ trợ: " + path); return null; }
      if (count >= 120) { warnings.push("Vượt quá 120 ảnh trong một lần nhập."); return null; }
      const bytes = await entry.async("nodebuffer");
      if (!looksValid(bytes, type)) { warnings.push("Ảnh có định dạng không hợp lệ: " + path); return null; }
      if (bytes.length > MAX_IMAGE) { warnings.push("Ảnh lớn hơn 245 KB: " + path + ". Cần nén hoặc chèn thủ công."); return null; }
      if (sum + bytes.length > MAX_SUM) { warnings.push("Ảnh vượt giới hạn 3 MB cho một lần nhập. Hãy chia đề."); return null; }
      sum += bytes.length; count++;
      const value = "data:" + type + ";base64," + bytes.toString("base64");
      cache.set(path, value);
      return value;
    },
    count() { return count; },
  };
}
function textOfChild(element, name) {
  const child = Array.from({ length: element.childNodes.length }, (_, i) => element.childNodes.item(i))
    .find((node) => node.nodeType === 1 && node.localName === name);
  return child?.textContent || "";
}
async function documentImport(zip) {
  const main = "word/document.xml";
  const entry = zip.file(main);
  if (!entry) throw new Error("DOCX không có nội dung Word.");
  const warnings = [], pics = collector(zip, warnings);
  const relations = await rels(zip, main);
  const doc = parseXml(await entry.async("string"));
  const lines = [];
  for (const paragraph of elements(doc, "p")) {
    const result = [];
    async function visit(node) {
      if (!node || node.nodeType !== 1) return;
      if (node.localName === "t") { result.push(node.textContent || ""); return; }
      if (node.localName === "tab") { result.push(" "); return; }
      if (node.localName === "br") { result.push("\n"); return; }
      if (node.localName === "blip") {
        const imagePath = relations.get(attribute(node, "embed"));
        if (!imagePath) { warnings.push("Có ảnh Word không tìm thấy liên kết."); return; }
        const data = await pics.read(imagePath);
        if (data) result.push("\n![Hình minh họa](" + data + ")\n");
        return;
      }
      for (let i = 0; i < node.childNodes.length; i++) await visit(node.childNodes.item(i));
    }
    for (let i = 0; i < paragraph.childNodes.length; i++) await visit(paragraph.childNodes.item(i));
    const line = result.join("").trim();
    if (line) lines.push(line);
  }
  return { importText: lines.join("\n"), imageCount: pics.count(), warnings };
}
function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function field(row, aliases) {
  for (const alias of aliases) {
    const pair = Object.entries(row).find(([key]) => normalized(key) === normalized(alias));
    if (pair && String(pair[1] ?? "").trim()) return String(pair[1]).trim();
  }
  return "";
}
async function embeddedSheetImages(zip, sheetName, pics, warnings) {
  const map = new Map();
  const bookPath = "xl/workbook.xml";
  const bookFile = zip.file(bookPath);
  if (!bookFile) throw new Error("XLSX không có workbook.xml");
  const book = parseXml(await bookFile.async("string"));
  const sheet = elements(book, "sheet").find((node) => normalized(node.getAttribute("name")) === normalized(sheetName));
  if (!sheet) return map;
  const bookRels = await rels(zip, bookPath);
  const sheetPath = bookRels.get(attribute(sheet, "id"));
  if (!sheetPath || !zip.file(sheetPath)) return map;
  const worksheet = parseXml(await zip.file(sheetPath).async("string"));
  const worksheetRels = await rels(zip, sheetPath);
  for (const drawing of elements(worksheet, "drawing")) {
    const drawingPath = worksheetRels.get(attribute(drawing, "id"));
    if (!drawingPath || !zip.file(drawingPath)) continue;
    const content = parseXml(await zip.file(drawingPath).async("string"));
    const drawingRels = await rels(zip, drawingPath);
    for (const anchor of [...elements(content, "oneCellAnchor"), ...elements(content, "twoCellAnchor")]) {
      const from = elements(anchor, "from")[0];
      const index = from ? Number(textOfChild(from, "row")) + 1 : NaN;
      if (!Number.isInteger(index) || index < 2) { warnings.push("Có ảnh không gắn với dòng dữ liệu câu hỏi."); continue; }
      for (const blip of elements(anchor, "blip")) {
        const imagePath = drawingRels.get(attribute(blip, "embed"));
        if (!imagePath) { warnings.push("Không tìm thấy quan hệ ảnh Excel."); continue; }
        const data = await pics.read(imagePath);
        if (data) map.set(index, [...(map.get(index) || []), data]);
      }
    }
  }
  return map;
}
async function sheetImport(zip, buffer) {
  const module = await import("read-excel-file/node");
  const reader = module.default;
  const sheets = await reader(buffer);
  if (!Array.isArray(sheets) || !sheets.length) throw new Error("Không đọc được sheet Excel.");
  const main = sheets.find((item) => normalized(item.sheet) === "cauhoi") || sheets[0];
  const warnings = [], pics = collector(zip, warnings);
  const byRow = await embeddedSheetImages(zip, main.sheet, pics, warnings);
  const [headers, ...rows] = main.data;
  const questions = [];
  for (let i = 0; i < rows.length; i++) {
    const row = Object.fromEntries(headers.map((heading, col) => [String(heading ?? ""), rows[i]?.[col] ?? ""]));
    const question = field(row, ["question", "prompt", "câu hỏi", "nội dung câu hỏi"]);
    const options = ["A", "B", "C", "D", "E", "F"].map((key) => field(row, [key, "option " + key])).filter(Boolean);
    if (!question || options.length < 2) {
      if (byRow.has(i + 2)) warnings.push("Ảnh tại dòng " + (i + 2) + " không có câu hỏi hợp lệ.");
      continue;
    }
    let prompt = question;
    const embedded = byRow.get(i + 2) || [];
    for (const url of embedded) prompt += "\n![Hình minh họa](" + url + ")";
    const image = field(row, ["image", "ảnh", "hình ảnh"]);
    if (image) {
      if (/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(image) || (image.startsWith("/") && !image.startsWith("//")))
        prompt += "\n![Hình minh họa](" + image + ")";
      else warnings.push("Dòng " + (i + 2) + ": URL ảnh bên ngoài bị chặn; hãy nhúng ảnh trong Excel.");
    }
    questions.push({ prompt, options, correct: field(row, ["correct", "answer", "đáp án"]) || "A", explanation: field(row, ["explanation", "giải thích", "lời giải"]) });
  }
  if (!questions.length) throw new Error("Excel thiếu các cột question, A, B, C, D, correct.");
  return { importText: JSON.stringify({ questions }), imageCount: pics.count(), warnings };
}
async function convertOfficeFile(fileName, buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 8 * 1024 * 1024) throw new Error("File phải nhỏ hơn 8 MB.");
  const name = String(fileName || "").toLowerCase();
  if (!/\.(xlsx|docx)$/.test(name)) throw new Error("Chỉ nhận Word DOCX hoặc Excel XLSX. PDF chưa hỗ trợ trích ảnh.");
  const zip = await JSZip.loadAsync(buffer);
  if (Object.keys(zip.files).length > 1500) throw new Error("Tệp Office có quá nhiều thành phần.");
  const uncompressed = Object.values(zip.files).reduce((sum, entry) => sum + Number(entry._data?.uncompressedSize || 0), 0);
  if (uncompressed > 36 * 1024 * 1024) throw new Error("File Office có dữ liệu giải nén quá lớn.");
  return name.endsWith(".docx") ? documentImport(zip) : sheetImport(zip, buffer);
}
module.exports = { convertOfficeFile };
