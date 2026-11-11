import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getStoreImageUrl, storeItemImageFile } from "../src/lib/store-image-url";
import {
  imageMime, isStoreFileInfo, readStoreAsset, storeAssetPath, storeUploadedAsset,
} from "../src/lib/store-upload-storage";

describe("private store assets", () => {
  it("only creates safe image URLs from random stored filenames", () => {
    const good = "store-img-" + "a".repeat(32) + ".png";
    assert.equal(getStoreImageUrl(good), "/api/store/images/" + good);
    assert.equal(storeItemImageFile({ imageFile: good }), "/api/store/images/" + good);
    assert.equal(imageMime(good), "image/png");
    assert.equal(getStoreImageUrl("../config.png"), null);
    assert.equal(getStoreImageUrl("javascript:alert(1)"), null);
    assert.equal(getStoreImageUrl("store-img-a.svg"), null);
    assert.equal(storeItemImageFile({ imageFile: "../../private" }), null);
    assert.throws(() => storeAssetPath("../secrets"), /không hợp lệ/);
  });

  it("only accepts metadata describing bounded, safe private documents", () => {
    const valid = { storedName: "store-file-" + "b".repeat(32) + ".pdf",
      originalName: "Bài tập.pdf", mimeType: "application/pdf", fileSize: 100 };
    assert.equal(isStoreFileInfo(valid), true);
    assert.equal(isStoreFileInfo({ ...valid, storedName: "../etc/passwd" }), false);
    assert.equal(isStoreFileInfo({ ...valid, fileSize: 99_000_000 }), false);
    assert.equal(isStoreFileInfo({ ...valid, originalName: "" }), false);
  });

  it("stores validated PNG outside public assets and rejects forged image bytes", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "educhi-store-"));
    const previous = process.env.DOCUMENT_STORAGE_DIR;
    const previousScan = process.env.DOCUMENT_SCAN_REQUIRED;
    process.env.DOCUMENT_STORAGE_DIR = path.join(tmp, "documents");
    process.env.DOCUMENT_SCAN_REQUIRED = "false";
    try {
      const png = Buffer.alloc(40);
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png, 0);
      png.writeUInt32BE(13, 8);
      png.write("IHDR", 12, "ascii");
      png.writeUInt32BE(16, 16);
      png.writeUInt32BE(16, 20);
      const file = new File([png], "avatar.png", { type: "image/png" });
      const saved = await storeUploadedAsset(file, "image");
      assert.match(saved.storedName, /^store-img-[0-9a-f]{32}\.png$/);
      assert.deepEqual(await readStoreAsset(saved.storedName, 5 * 1024 * 1024), png);
      assert.deepEqual(await readFile(storeAssetPath(saved.storedName)), png);
      const bad = new File([Buffer.from("not an image!")], "trick.png", { type: "image/png" });
      await assert.rejects(() => storeUploadedAsset(bad, "image"), /PNG, JPG/);
    } finally {
      if (previous === undefined) delete process.env.DOCUMENT_STORAGE_DIR;
      else process.env.DOCUMENT_STORAGE_DIR = previous;
      if (previousScan === undefined) delete process.env.DOCUMENT_SCAN_REQUIRED;
      else process.env.DOCUMENT_SCAN_REQUIRED = previousScan;
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
