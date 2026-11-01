"use strict";

const path = require("node:path");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
function invalid() { throw new Error("Ảnh phải là JPG, PNG, WEBP hoặc GIF hợp lệ (tối đa 5MB)."); }

function validateMotivationImageBuffer(buffer, filename) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12 || buffer.length > MAX_IMAGE_BYTES) invalid();
  const ext = path.extname(filename).toLowerCase();
  let width = 0, height = 0;
  if (ext === ".png" && buffer.length >= 33 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      buffer.toString("latin1", 12, 16) === "IHDR" && buffer.readUInt32BE(8) === 13) {
    width = buffer.readUInt32BE(16);
    height = buffer.readUInt32BE(20);
  } else if (ext === ".gif" &&
      ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) {
    width = buffer.readUInt16LE(6);
    height = buffer.readUInt16LE(8);
  } else if ((ext === ".jpg" || ext === ".jpeg") &&
      buffer[0] === 0xff && buffer[1] === 0xd8 &&
      buffer[2] === 0xff &&
      buffer.subarray(-2).equals(Buffer.from([0xff, 0xd9]))) {
    // The JPEG marker header is sufficient for type sniffing; full image
    // decoding/antivirus belongs to the production media processing pipeline.
    return { extension: ext, mimeType: "image/jpeg" };
  } else if (ext === ".webp" &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP" &&
      buffer.readUInt32LE(4) + 8 === buffer.length &&
      ["VP8 ", "VP8L", "VP8X"].includes(buffer.toString("ascii", 12, 16))) {
    return { extension: ext, mimeType: "image/webp" };
  } else {
    invalid();
  }
  if (!width || !height || width > 12000 || height > 12000 ||
      width * height > 40_000_000) invalid();
  const mimeType = ext === ".png" ? "image/png" : "image/gif";
  return { extension: ext, mimeType };
}

module.exports = { validateMotivationImageBuffer, MAX_IMAGE_BYTES };
