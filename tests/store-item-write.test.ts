import { Prisma } from "@prisma/client";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { storeItemWriteData } from "../src/lib/store-item-write";

describe("EXP shop Prisma JSON metadata", () => {
  it("converts empty metadata to Prisma.DbNull for new products", () => {
    const payload = { slug: "avatar-cam", metadata: null, price: 200 };
    const prepared = storeItemWriteData(payload);
    assert.equal(prepared.metadata, Prisma.DbNull);
    assert.equal(payload.metadata, null);
    assert.equal(prepared.slug, "avatar-cam");
  });

  it("handles removing a saved image or document on edit", () => {
    assert.equal(storeItemWriteData({ metadata: null }).metadata, Prisma.DbNull);
  });

  it("keeps existing effects, pictures and private document references", () => {
    const data = { metadata: { kind: "avatarFrame", imageFile: "store-img-" + "a".repeat(32) + ".png" } };
    assert.deepEqual(storeItemWriteData(data), data);
  });

  it("does not overwrite metadata on unrelated partial updates", () => {
    const payload = { price: 500 };
    assert.equal(storeItemWriteData(payload), payload);
  });
});
