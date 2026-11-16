import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  COOKIE_NAME, REFERRAL_CODE_PATTERN, newReferralCode,
  createInviteToken, parseInviteToken, calculateReferralRewardVnd,
} = require("../src/lib/referral-invites.js");

const SECRET = "test-secret-never-used-in-production-0123456789";
const USER_ID = "cm0testinviterid123456789";

describe("signed invite links and commission", () => {
  it("creates random, well-formed public referral codes", () => {
    const first = newReferralCode();
    const second = newReferralCode();
    assert.match(first, REFERRAL_CODE_PATTERN);
    assert.notEqual(first, second);
    assert.equal(COOKIE_NAME, "educhi_referral");
  });

  it("accepts only an authentic unexpired invite", () => {
    const now = Date.parse("2026-11-16T08:00:00Z");
    const token = createInviteToken(USER_ID, SECRET, now);
    assert.deepEqual(parseInviteToken(token, SECRET, now + 86400000), { inviterId: USER_ID, issuedAt: now });
    assert.equal(parseInviteToken(token + "a", SECRET, now), null);
    assert.equal(parseInviteToken(token, SECRET + "wrong", now), null);
    assert.equal(parseInviteToken(token, SECRET, now + 8 * 86400000), null);
    assert.equal(parseInviteToken(token, SECRET, now - 31000), null);
  });

  it("credits precisely 10% of settled integer VND, rounded down", () => {
    assert.equal(calculateReferralRewardVnd(39000), 3900);
    assert.equal(calculateReferralRewardVnd(99000), 9900);
    assert.equal(calculateReferralRewardVnd(299000), 29900);
    assert.equal(calculateReferralRewardVnd(9999), 999);
    assert.equal(calculateReferralRewardVnd(0), 0);
    assert.equal(calculateReferralRewardVnd(-50), 0);
    assert.equal(calculateReferralRewardVnd(3.4), 0);
  });
});
