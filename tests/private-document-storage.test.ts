import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
const {
  documentStorageDirectory, documentStoredPath, readPrivateDocument,
} = require("../src/lib/private-document-storage.js");
const { migrate, parseArgs } = require("../scripts/migrate-document-storage.js");

describe("private document storage", () => {
  it("keeps uploads outside public and rejects traversal and unsafe names", () => {
    const root = mkdtempSync(join(tmpdir(), "eduva-private-"));
    try {
      const env = { DOCUMENT_STORAGE_DIR: "" };
      const dir = documentStorageDirectory(env, root);
      assert.equal(dir, join(root, "storage", "documents"));
      assert.equal(documentStoredPath("a2b4c6d8.pdf", env, root), join(dir, "a2b4c6d8.pdf"));
      assert.throws(() => documentStoredPath("../../etc/passwd", env, root));
      assert.throws(() => documentStoredPath("../a2b4c6d8.pdf", env, root));
      assert.throws(() => documentStoredPath("a2b4c6d8.svg", env, root));
      assert.throws(() => documentStorageDirectory({ DOCUMENT_STORAGE_DIR: join(root, "public", "uploads") }, root));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("rejects symlinks and only loads files from the private directory", () => {
    const root = mkdtempSync(join(tmpdir(), "eduva-private-"));
    const env = {};
    try {
      const dir = documentStorageDirectory(env, root);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "good1234.pdf"), "test file");
      assert.equal(readPrivateDocument("good1234.pdf", env, root).toString(), "test file");
      symlinkSync(join(dir, "good1234.pdf"), join(dir, "link1234.pdf"));
      assert.throws(() => readPrivateDocument("link1234.pdf", env, root));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("migrates only matching database files, verifies SHA and optionally removes legacy copies", async () => {
    const root = mkdtempSync(join(tmpdir(), "eduva-migration-"));
    const old = join(root, "public", "uploads", "documents");
    try {
      mkdirSync(old, { recursive: true });
      writeFileSync(join(old, "valid1234.pdf"), "%PDF-1.7\n%%EOF");
      const db = { document: { findMany: async () => [{ id: "d1", storedName: "valid1234.pdf" }] } };
      const env = {};
      const first = await migrate({ db, root, env });
      assert.equal(first.copied, 1);
      const again = await migrate({ db, root, env, removeLegacy: true });
      assert.equal(again.alreadyCopied, 1);
      assert.equal(again.removed, 1);
      const last = await migrate({ db, root, env });
      assert.equal(last.alreadyCopied, 1);
      assert.equal(last.missing, 0);
      assert.throws(() => parseArgs(["--remove-legacy", "--dry-run"]));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
