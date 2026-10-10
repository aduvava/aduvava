import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("access rules", () => {
  it("keeps free content open and pro content gated by subscription", () => {
    const canAccess = (accessLevel: "FREE" | "PRO", activeSubscription: boolean) => accessLevel === "FREE" || activeSubscription;
    assert.equal(canAccess("FREE", false), true);
    assert.equal(canAccess("PRO", false), false);
    assert.equal(canAccess("PRO", true), true);
  });
});
