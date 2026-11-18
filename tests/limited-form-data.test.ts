import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readLimitedFormData } from "../src/lib/limited-form-data";
import { RequestBodyTooLargeError } from "../src/lib/limited-json";

describe("bounded multipart uploads", () => {
  it("parses valid small form data", async () => {
    const form = new FormData();
    form.set("title", "Educhi");
    const request = new Request("https://example.test/upload", {
      method: "POST", body: form,
    });
    const parsed = await readLimitedFormData(request, 1024);
    assert.equal(parsed.get("title"), "Educhi");
  });

  it("rejects large stream bodies even when no Content-Length is supplied", async () => {
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(8192)]), "large.txt");
    const request = new Request("https://example.test/upload", {
      method: "POST", body: form,
    });
    await assert.rejects(() => readLimitedFormData(request, 1024),
      (error: unknown) => error instanceof RequestBodyTooLargeError);
  });

  it("rejects declared over-limit bodies before parsing", async () => {
    const form = new FormData();
    form.set("title", "Educhi");
    const request = new Request("https://example.test/upload", {
      method: "POST", body: form,
    });
    request.headers.set("content-length", "999999");
    await assert.rejects(() => readLimitedFormData(request, 1024),
      (error: unknown) => error instanceof RequestBodyTooLargeError);
  });
});
