"use strict";

const path = require("node:path");
const { inflateRawSync } = require("node:zlib");

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_ENTRIES = 1200;
const MAX_EXPANDED_SIZE = 100 * 1024 * 1024;
const MAX_ENTRY_EXPANDED = 30 * 1024 * 1024;
const MAX_RATIO = 100;

const SUPPORTED = Object.freeze({
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
});

class InvalidDocumentError extends Error {
  constructor(message = "Unsupported or unsafe document file") {
    super(message);
    this.name = "InvalidDocumentError";
    this.status = 400;
  }
}

function fail(message) { throw new InvalidDocumentError(message); }

function readEntryPayload(buffer, entry) {
  const offset = entry.localOffset;
  if (offset < 0 || offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50) {
    fail("Invalid ZIP local header");
  }
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const start = offset + 30 + nameLength + extraLength;
  if (start + entry.compressedSize > buffer.length ||
      start + entry.compressedSize > entry.centralOffset) {
    fail("Invalid ZIP entry boundaries");
  }
  const raw = buffer.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) {
    try {
      return inflateRawSync(raw, { maxOutputLength: 1024 * 1024 });
    } catch {
      fail("Invalid or oversized document XML");
    }
  }
  fail("Unsupported ZIP compression");
}

function verifyOoxml(buffer, extension) {
  if (buffer.length < 60 || buffer.readUInt32LE(0) !== 0x04034b50) {
    fail("Invalid Office ZIP signature");
  }
  let end = -1;
  const earliest = Math.max(0, buffer.length - 22 - 65535);
  for (let i = buffer.length - 22; i >= earliest; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50 && i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) {
      end = i;
      break;
    }
  }
  if (end < 0) fail("ZIP central directory is missing");
  if (buffer.readUInt16LE(end + 4) !== 0 ||
      buffer.readUInt16LE(end + 6) !== 0) fail("Multi-disk ZIP archives are unsupported");

  const count = buffer.readUInt16LE(end + 10);
  const size = buffer.readUInt32LE(end + 12);
  const directoryStart = buffer.readUInt32LE(end + 16);
  if (!count || count > MAX_ENTRIES || count === 0xffff ||
      size === 0xffffffff || directoryStart === 0xffffffff ||
      directoryStart + size !== end || directoryStart < 4) {
    fail("Invalid or oversized ZIP central directory");
  }

  const names = new Set();
  let totalExpanded = 0;
  let entryOffset = directoryStart;
  let contentTypes = null;
  for (let i = 0; i < count; i++) {
    if (entryOffset + 46 > end || buffer.readUInt32LE(entryOffset) !== 0x02014b50) {
      fail("Corrupt ZIP central directory");
    }
    const flags = buffer.readUInt16LE(entryOffset + 8);
    const method = buffer.readUInt16LE(entryOffset + 10);
    const compressedSize = buffer.readUInt32LE(entryOffset + 20);
    const expandedSize = buffer.readUInt32LE(entryOffset + 24);
    const nameLength = buffer.readUInt16LE(entryOffset + 28);
    const extraLength = buffer.readUInt16LE(entryOffset + 30);
    const commentLength = buffer.readUInt16LE(entryOffset + 32);
    const localOffset = buffer.readUInt32LE(entryOffset + 42);
    const next = entryOffset + 46 + nameLength + extraLength + commentLength;
    if (next > end || nameLength === 0 ||
        compressedSize === 0xffffffff || expandedSize === 0xffffffff ||
        (flags & 1) !== 0 || ![0, 8].includes(method) ||
        expandedSize > MAX_ENTRY_EXPANDED ||
        (compressedSize === 0 && expandedSize > 0) ||
        (compressedSize && expandedSize > compressedSize * MAX_RATIO)) {
      fail("Unsafe ZIP entry size, encryption, or compression");
    }
    const name = buffer.toString("utf8", entryOffset + 46, entryOffset + 46 + nameLength);
    if (name.includes("\0") || name.includes("\\") || name.startsWith("/") ||
        name.split("/").includes("..") || /^(?:[A-Za-z]:)/.test(name) ||
        /(?:^|\/)(?:vbaProject\.bin|activeX)(?:\/|$)/i.test(name) ||
        /vbaProject\.bin$/i.test(name) ||
        names.has(name)) {
      fail("Unsafe ZIP archive path or active content");
    }
    names.add(name);
    totalExpanded += expandedSize;
    if (totalExpanded > MAX_EXPANDED_SIZE) fail("Decompressed document is too large");
    if (name === "[Content_Types].xml") {
      contentTypes = { method, compressedSize, expandedSize, localOffset, centralOffset: directoryStart };
    }
    entryOffset = next;
  }
  if (entryOffset !== end || !contentTypes ||
      !names.has(extension === ".docx" ? "word/document.xml" : "ppt/presentation.xml")) {
    fail("Office document is missing required XML parts");
  }
  const content = readEntryPayload(buffer, contentTypes).toString("utf8");
  const expected = extension === ".docx"
    ? "wordprocessingml.document.main+xml"
    : "presentationml.presentation.main+xml";
  if (!content.includes(expected)) fail("Office file type does not match its extension");
}

function validateDocumentBuffer(data, filename, declaredMime = "") {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (!buffer.length || buffer.length > MAX_FILE_SIZE) {
    fail("Document must be between 1 byte and 15 MB");
  }
  const extension = path.extname(filename).toLowerCase();
  const mimeType = SUPPORTED[extension];
  if (!mimeType) fail("Only PDF, DOCX and PPTX files are supported");
  if (declaredMime && declaredMime !== "application/octet-stream" && declaredMime !== mimeType) {
    fail("Document MIME type does not match its extension");
  }
  if (extension === ".pdf") {
    if (buffer.length < 12 || !buffer.subarray(0, 8).toString("latin1").startsWith("%PDF-") ||
        !buffer.subarray(Math.max(0, buffer.length - 2048)).includes(Buffer.from("%%EOF"))) {
      fail("Invalid PDF signature or missing end marker");
    }
  } else {
    verifyOoxml(buffer, extension);
  }
  return { extension, mimeType, fileSize: buffer.length };
}

module.exports = { validateDocumentBuffer, InvalidDocumentError, MAX_FILE_SIZE };
