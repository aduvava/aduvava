"use strict";

const fs = require("node:fs");
const path = require("node:path");

const STORED_NAME = /^[a-zA-Z0-9_-]{8,120}\.(pdf|docx|pptx)$/;

function documentStorageDirectory(env = process.env, root = process.cwd()) {
  const selected = env.DOCUMENT_STORAGE_DIR
    ? path.resolve(env.DOCUMENT_STORAGE_DIR)
    : path.join(root, "storage", "documents");
  const publicRoot = path.resolve(root, "public");
  const relative = path.relative(publicRoot, selected);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    throw new Error("Private document storage must be outside public/");
  }
  return selected;
}

function documentStoredPath(storedName, env = process.env, root = process.cwd()) {
  if (typeof storedName !== "string" || !STORED_NAME.test(storedName)) {
    throw new Error("Unsafe document storage name");
  }
  return path.join(documentStorageDirectory(env, root), storedName);
}

// Prevent symlink tricks even if someone has write access to the upload volume.
function readPrivateDocument(storedName, env = process.env, root = process.cwd()) {
  const file = documentStoredPath(storedName, env, root);
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > 15 * 1024 * 1024 || stat.size === 0) {
      throw new Error("Invalid stored document size/type");
    }
    return fs.readFileSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = { documentStorageDirectory, documentStoredPath, readPrivateDocument, STORED_NAME };
