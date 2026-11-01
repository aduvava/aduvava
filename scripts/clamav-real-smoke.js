#!/usr/bin/env node
"use strict";

// Actual ClamAV integration, intended for isolated CI and staging.
// EICAR is a harmless antivirus test pattern, not malware.
const assert = require("node:assert/strict");
const net = require("node:net");
const { scanDocumentBuffer, DocumentScanError } =
  require("../src/lib/document-malware-scan.js");

async function ready(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(1500);
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.on("error", () => resolve(false));
  });
}
async function waitForScanner(host, port) {
  for (let attempt = 0; attempt < 90; attempt++) {
    if (await ready(host, port)) return;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error("ClamAV did not become reachable within 7.5 minutes");
}

async function main() {
  const host = process.env.CLAMAV_HOST || "127.0.0.1";
  const port = Number(process.env.CLAMAV_PORT || 3310);
  await waitForScanner(host, port);
  const env = {
    NODE_ENV: "production",
    DOCUMENT_SCAN_REQUIRED: "true",
    CLAMAV_HOST: host,
    CLAMAV_PORT: String(port),
  };
  const clean = await scanDocumentBuffer(Buffer.from("%PDF-1.7\n%%EOF\n"), env);
  assert.equal(clean.scanned, true, "clean harmless file should scan");

  // Construct the harmless EICAR antivirus test signature in memory.
  const eicar = ["X5O!P%@AP[4\\PZX54(P^)7CC)7}$", "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"].join("");
  await assert.rejects(
    scanDocumentBuffer(Buffer.from(eicar, "ascii"), env),
    (error) => error instanceof DocumentScanError && error.status === 400,
    "real ClamAV must flag EICAR before upload is accepted",
  );

  await assert.rejects(
    scanDocumentBuffer(Buffer.from("%PDF-1.7\n%%EOF\n"), {
      ...env, CLAMAV_PORT: "0",
    }),
    DocumentScanError,
    "upload must fail closed if scanner endpoint is invalid",
  );
  console.log("Real ClamAV: clean file allowed, harmless EICAR rejected, broken scanner fails closed.");
}

main().catch((error) => {
  console.error("Real ClamAV integration failed:", error.message);
  process.exitCode = 1;
});
