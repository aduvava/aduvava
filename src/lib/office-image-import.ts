"use client";

import JSZip from "jszip";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_BYTES = 245_000;
const MAX_IMAGES = 150;
const MAX_TOTAL_IMAGE_BYTES = 5_500_000;

type ImportResult = { warnings: string[]; imageCount: number };
export type WordImportResult = ImportResult & { text: string };
export type ExcelImageResult = ImportResult & { byRow: Map<number, string[]> };

function xml(source: string): Document {
  const doc = new DOMParser().parseFromString(source, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Tệp Office chứa XML không hợp lệ.");
  return doc;
}
function nodes(root: Document | Element, name: string): Element[] {
  return Array.from(root.getElementsByTagNameNS("*", name));
}
function attr(element: Element | undefined, localName: string): string {
  if (!element) return "";
  return Array.from(element.attributes).find((value) => value.localName === localName)?.value ?? "";
}
function childText(root: Element, name: string): string {
  return Array.from(root.children).find((value) => value.localName === name)?.textContent?.trim() ?? "";
}
function resolvePath(basePath: string, target: string): string | null {
  if (!target || /^[a-z]+:/i.test(target)) return null;
  const input = (target.startsWith("/") ? target.slice(1) : basePath.slice(0, basePath.lastIndexOf("/") + 1) + target).replace(/\\/g, "/");
  const parts: string[] = [];
  for (const part of input.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
}
function relFile(path: string): string {
  const slash = path.lastIndexOf("/");
  return path.slice(0, slash + 1) + "_rels/" + path.slice(slash + 1) + ".rels";
}
async function relationships(zip: JSZip, part: string): Promise<Map<string, string>> {
  const file = zip.file(relFile(part));
  const result = new Map<string, string>();
  if (!file) return result;
  const doc = xml(await file.async("string"));
  for (const relation of nodes(doc, "Relationship")) {
    if (relation.getAttribute("TargetMode") === "External") continue;
    const id = relation.getAttribute("Id") ?? "";
    const target = resolvePath(part, relation.getAttribute("Target") ?? "");
    if (id && target) result.set(id, target);
  }
  return result;
}
function mime(path: string): string | null {
  const extension = path.toLowerCase().split(".").pop();
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return null;
}
function hasImageSignature(bytes: Uint8Array, kind: string): boolean {
  if (kind === "image/png") return bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  if (kind === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (kind === "image/gif") return bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70;
  if (kind === "image/webp") return String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
  return false;
}
function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không thể đọc ảnh."));
    reader.readAsDataURL(blob);
  });
}
async function compactImage(bytes: Uint8Array, kind: string): Promise<Blob | null> {
  const input = new Blob([new Uint8Array(bytes)], { type: kind });
  if (input.size <= MAX_IMAGE_BYTES) return input;
  try {
    const bitmap = await createImageBitmap(input);
    for (const maxEdge of [1600, 1200, 900, 680]) {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) break;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.88, 0.73, 0.56]) {
        const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
        if (compressed && compressed.size <= MAX_IMAGE_BYTES) {
          bitmap.close();
          return compressed;
        }
      }
    }
    bitmap.close();
  } catch { /* An unsupported/corrupted image must be flagged, never silently discarded. */ }
  return null;
}
async function openOffice(file: File): Promise<JSZip> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Tệp Office vượt quá 8 MB. Hãy chia đề thành các tệp nhỏ.");
  const zip = await JSZip.loadAsync(file);
  if (Object.keys(zip.files).length > 1500) throw new Error("Tệp Office chứa quá nhiều thành phần.");
  const uncompressed = Object.values(zip.files).reduce((sum, entry) => sum + Number((entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0), 0);
  if (uncompressed > 36 * 1024 * 1024) throw new Error("Tệp Office có dữ liệu giải nén quá lớn.");
  return zip;
}
function imageCollector(zip: JSZip, warnings: string[]) {
  let count = 0;
  let total = 0;
  const cache = new Map<string, Promise<string | null>>();
  async function get(path: string): Promise<string | null> {
    if (cache.has(path)) return cache.get(path)!;
    const result = (async () => {
      if (count >= MAX_IMAGES) { warnings.push("Đã đạt giới hạn 150 ảnh/tệp."); return null; }
      const entry = zip.file(path);
      const kind = mime(path);
      if (!entry || !kind) { warnings.push("Không hỗ trợ ảnh hoặc thiếu tệp ảnh: " + path); return null; }
      const bytes = await entry.async("uint8array");
      if (!hasImageSignature(bytes, kind)) { warnings.push("Định dạng ảnh không hợp lệ: " + path); return null; }
      const compacted = await compactImage(bytes, kind);
      if (!compacted) { warnings.push("Ảnh " + path + " quá lớn, không thể nén dưới 245 KB."); return null; }
      if (total + compacted.size > MAX_TOTAL_IMAGE_BYTES) {
        warnings.push("Tổng dung lượng ảnh vượt 5,5 MB. Hãy chia đề để tránh mất ảnh.");
        return null;
      }
      total += compacted.size;
      count++;
      return blobDataUrl(compacted);
    })();
    cache.set(path, result);
    return result;
  }
  return { get, getCount: () => count };
}
export async function extractDocxWithImages(file: File): Promise<WordImportResult> {
  const zip = await openOffice(file);
  const main = "word/document.xml";
  const documentFile = zip.file(main);
  if (!documentFile) throw new Error("Không tìm thấy nội dung Word trong tệp DOCX.");
  const warnings: string[] = [];
  const images = imageCollector(zip, warnings);
  const rels = await relationships(zip, main);
  const documentXml = xml(await documentFile.async("string"));
  const lines: string[] = [];
  for (const paragraph of nodes(documentXml, "p")) {
    const parts: string[] = [];
    async function visit(node: Node): Promise<void> {
      if (node.nodeType !== 1) return;
      const element = node as Element;
      if (element.localName === "t") { parts.push(element.textContent ?? ""); return; }
      if (element.localName === "tab") { parts.push(" "); return; }
      if (element.localName === "br") { parts.push("\n"); return; }
      if (element.localName === "blip") {
        const path = rels.get(attr(element, "embed"));
        if (path) {
          const dataUrl = await images.get(path);
          if (dataUrl) parts.push("\n![Hình minh họa](" + dataUrl + ")\n");
        } else warnings.push("Một hình trong Word không có liên kết dữ liệu.");
        return;
      }
      for (const item of Array.from(element.childNodes)) await visit(item);
    }
    for (const part of Array.from(paragraph.childNodes)) await visit(part);
    const line = parts.join("").trim();
    if (line) lines.push(line);
  }
  return { text: lines.join("\n"), imageCount: images.getCount(), warnings };
}
export async function extractXlsxEmbeddedImages(file: File, sheetName: string): Promise<ExcelImageResult> {
  const zip = await openOffice(file);
  const warnings: string[] = [];
  const images = imageCollector(zip, warnings);
  const byRow = new Map<number, string[]>();
  const workbook = "xl/workbook.xml";
  const workbookFile = zip.file(workbook);
  if (!workbookFile) throw new Error("Không tìm thấy bảng tính Excel hợp lệ.");
  const workbookXml = xml(await workbookFile.async("string"));
  const sheetNodes = nodes(workbookXml, "sheet");
  const selected = sheetNodes.find((sheet) => (sheet.getAttribute("name") ?? "").toLowerCase() === sheetName.toLowerCase()) ?? sheetNodes[0];
  if (!selected) return { byRow, imageCount: 0, warnings };
  const workbookRels = await relationships(zip, workbook);
  const sheetPath = workbookRels.get(attr(selected, "id"));
  if (!sheetPath || !zip.file(sheetPath)) return { byRow, imageCount: 0, warnings: ["Không tìm thấy sheet chứa câu hỏi."] };
  const sheetXml = xml(await zip.file(sheetPath)!.async("string"));
  const sheetRels = await relationships(zip, sheetPath);
  for (const drawing of nodes(sheetXml, "drawing")) {
    const drawingPath = sheetRels.get(attr(drawing, "id"));
    if (!drawingPath || !zip.file(drawingPath)) continue;
    const drawingXml = xml(await zip.file(drawingPath)!.async("string"));
    const drawingRels = await relationships(zip, drawingPath);
    for (const anchor of [...nodes(drawingXml, "oneCellAnchor"), ...nodes(drawingXml, "twoCellAnchor")]) {
      const from = nodes(anchor, "from")[0];
      const row = from ? Number(childText(from, "row")) + 1 : NaN;
      if (!Number.isInteger(row) || row < 2) {
        warnings.push("Có ảnh Excel không gắn với dòng câu hỏi (hoặc nằm ở dòng tiêu đề).");
        continue;
      }
      for (const blip of nodes(anchor, "blip")) {
        const imagePath = drawingRels.get(attr(blip, "embed"));
        if (!imagePath) { warnings.push("Ảnh Excel bị thiếu quan hệ nhúng."); continue; }
        const dataUrl = await images.get(imagePath);
        if (!dataUrl) continue;
        const current = byRow.get(row) ?? [];
        current.push(dataUrl);
        byRow.set(row, current);
      }
    }
  }
  return { byRow, imageCount: images.getCount(), warnings };
}