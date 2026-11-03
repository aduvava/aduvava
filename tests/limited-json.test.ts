import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { InvalidJsonBodyError, readLimitedJson, RequestBodyTooLargeError } from "../src/lib/limited-json";

describe("bounded JSON request bodies", () => {
  it("parses valid JSON within the byte limit", async () => {
    const req = new Request("https://eduva.test/api/exams/create", {
      method: "POST", body: JSON.stringify({ title: "Bài thi" }),
    });
    assert.deepEqual(await readLimitedJson(req, 1000), { title: "Bài thi" });
  });

  it("rejects oversized requests with and without Content-Length", async () => {
    const req = new Request("https://eduva.test/", { method: "POST", body: JSON.stringify({ huge: "x".repeat(5000) }) });
    await assert.rejects(readLimitedJson(req, 100), RequestBodyTooLargeError);
    const oversized = new Request("https://eduva.test/", { method: "POST", body: "abc", headers: { "content-length": "2000" } });
    await assert.rejects(readLimitedJson(oversized, 100), RequestBodyTooLargeError);
  });

  it("does not count characters instead of UTF-8 bytes and safely rejects malformed JSON", async () => {
    const request = new Request("https://eduva.test/", { method: "POST", body: JSON.stringify({ t: "đ".repeat(20) }) });
    await assert.rejects(readLimitedJson(request, 35), RequestBodyTooLargeError);
    await assert.rejects(readLimitedJson(new Request("https://eduva.test/", { method: "POST", body: "oops" }), 100), InvalidJsonBodyError);
  });
});
