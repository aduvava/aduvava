import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, writeFile } from "node:fs/promises";
import path from "node:path";
import { documentStorageDirectory } from "@/lib/private-document-storage";
import { validateMotivationImageBuffer, MAX_IMAGE_BYTES } from "../../admin-server/image-file-validation";
import { validateDocumentBuffer, InvalidDocumentError, MAX_FILE_SIZE } from "@/lib/document-file-validation";
import { scanDocumentBuffer } from "@/lib/document-malware-scan";
import { getStoreImageUrl } from "@/lib/store-image-url";

const STORE_FILE_NAME = /^store-file-[0-9a-f]{32}\.(?:pdf|docx|pptx)$/;
const STORED_ASSET = /^store-(?:img|file)-[0-9a-f]{32}\.(?:png|jpe?g|webp|gif|pdf|docx|pptx)$/;

export type StoreFileInfo = {
  storedName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
};

export function isStoreFileInfo(value: unknown): value is StoreFileInfo {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.storedName === "string" && STORE_FILE_NAME.test(record.storedName) &&
    typeof record.originalName === "string" && record.originalName.length > 0 &&
    typeof record.mimeType === "string" &&
    typeof record.fileSize === "number" && record.fileSize > 0 && record.fileSize <= MAX_FILE_SIZE;
}

export function storeAssetPath(name: string) {
  if (!STORED_ASSET.test(name) || !/^(store-img-|store-file-)/.test(name)) {
    throw new Error("Tên tệp vật phẩm không hợp lệ.");
  }
  // The document volume is persistent across code deployments and is not
  // reachable from /public. Reuse it to avoid losing purchases or avatars.
  return path.join(documentStorageDirectory(), "store-assets", name);
}

export function imageMime(name: string) {
  if (!getStoreImageUrl(name)) return null;
  const extension = path.extname(name);
  const types: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp",
  };
  return types[extension] ?? null;
}

export async function readStoreAsset(name: string, maxSize: number): Promise<Buffer> {
  const handle = await open(storeAssetPath(name), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stats = await handle.stat();
    if (!stats.isFile() || stats.size < 1 || stats.size > maxSize) throw new Error("Tệp vật phẩm không hợp lệ.");
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

export async function storeUploadedAsset(file: File, kind: "image" | "file") {
  const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_FILE_SIZE;
  if (!file.size || file.size > limit) throw new InvalidDocumentError("Tệp vượt dung lượng cho phép.");
  const buffer = Buffer.from(await file.arrayBuffer());
  let info: { extension: string; mimeType: string };
  if (kind === "image") {
    try {
      info = validateMotivationImageBuffer(buffer, file.name);
      if (file.type && file.type !== info.mimeType && file.type !== "application/octet-stream") {
        throw new Error("Loại ảnh không khớp dữ liệu thực tế.");
      }
    } catch {
      throw new InvalidDocumentError("Ảnh phải là PNG, JPG, WebP hoặc GIF hợp lệ (tối đa 5MB).");
    }
  } else {
    info = validateDocumentBuffer(buffer, file.name, file.type);
  }
  // Production blocks uploads when the configured malware scanner is absent.
  await scanDocumentBuffer(buffer);
  const storedName = "store-" + (kind === "image" ? "img-" : "file-") +
    randomUUID().replace(/-/g, "") + info.extension;
  const storedPath = storeAssetPath(storedName);
  await mkdir(path.dirname(storedPath), { recursive: true });
  await writeFile(storedPath, buffer, { flag: "wx", mode: 0o600 });
  return {
    storedName,
    originalName: path.basename(file.name).slice(0, 180),
    mimeType: info.mimeType,
    fileSize: buffer.length,
  } satisfies StoreFileInfo;
}
