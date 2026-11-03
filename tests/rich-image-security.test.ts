import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeRichImageUrl } from "../src/lib/rich-image-security";

describe("untrusted exam images", () => {
  it("allows local paths for images hosted on Eduva", () => {
    assert.equal(isSafeRichImageUrl("/subject-images/toan.png"), true);
    assert.equal(isSafeRichImageUrl("/images/geometry.png?width=600"), true);
  });
  it("retains safe small raster data without loading a third party", () => {
    assert.equal(isSafeRichImageUrl("data:image/png;base64," + "A".repeat(300_000)), true);
    assert.equal(isSafeRichImageUrl("data:image/jpeg;base64," + "A".repeat(350_000)), false);
    assert.equal(isSafeRichImageUrl("data:image/svg+xml;base64,AAAA"), false);
  });
  it("rejects external and protocol-relative tracking pixels", () => {
    for (const src of [
      "https://tracker.test/open?email=student",
      "http://tracker.test/img.png",
      "//tracker.test/a.png",
      "/\\tracker.test/a.png",
      "data:image/svg+xml;base64,AA==",
      "javascript:alert(1)",
      " /\\tracker.test/a.png ",
      "/safe\\evil",
    ]) assert.equal(isSafeRichImageUrl(src), false, src);
  });
});
