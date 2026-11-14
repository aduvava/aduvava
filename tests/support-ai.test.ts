import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSupportCostMicroUsd, shouldEscalateSupport,
  supportCurrentMonth, SUPPORT_AI_MODEL, SUPPORT_AI_HOLD_MICROS,
} from "../src/lib/support-ai";

describe("Educhi hybrid support AI cost and handoff policy", () => {
  it("uses a fixed low-cost model and conservative per-request reservation", () => {
    assert.equal(SUPPORT_AI_MODEL, "gpt-6-luna");
    assert.ok(SUPPORT_AI_HOLD_MICROS >= 10000);
  });

  it("calculates conservative cost estimates in micro-USD", () => {
    assert.equal(calculateSupportCostMicroUsd(1000, 500), 350);
    assert.equal(calculateSupportCostMicroUsd(-1, 20), 0);
  });

  it("routes payment complaints and human support requests to Admin", () => {
    assert.equal(shouldEscalateSupport("Tôi đã chuyển khoản nhưng chưa được VIP"), true);
    assert.equal(shouldEscalateSupport("Tôi muốn gặp Admin"), true);
    assert.equal(shouldEscalateSupport("Giải phương trình bậc hai"), false);
  });

  it("uses UTC month periods consistently across VPS instances", () => {
    assert.equal(supportCurrentMonth(new Date("2026-11-30T23:59:59Z")), "2026-11");
    assert.equal(supportCurrentMonth(new Date("2026-12-01T00:00:00Z")), "2026-12");
  });
});
