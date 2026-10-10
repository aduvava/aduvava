import { describe, expect, it } from "vitest";

describe("access rules", () => {
  it("keeps free content open and pro content gated by subscription", () => {
    const canAccess = (accessLevel: "FREE" | "PRO", activeSubscription: boolean) => accessLevel === "FREE" || activeSubscription;
    expect(canAccess("FREE", false)).toBe(true);
    expect(canAccess("PRO", false)).toBe(false);
    expect(canAccess("PRO", true)).toBe(true);
  });
});
