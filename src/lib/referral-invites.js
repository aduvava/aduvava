"use strict";

const { createHmac, randomBytes, timingSafeEqual } = require("node:crypto");

const COOKIE_NAME = "educhi_referral";
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const REFERRAL_CODE_PATTERN = /^EC[A-F0-9]{10}$/;

/** Opaque, unpredictable public sharing code (not a login credential). */
function newReferralCode() {
  return "EC" + randomBytes(5).toString("hex").toUpperCase();
}

/** @param {string} inviterId @param {string} secret @param {number} [issuedAt] */
function createInviteToken(inviterId, secret, issuedAt = Date.now()) {
  if (!secret || secret.length < 16 || !/^[a-z0-9_-]{10,64}$/i.test(inviterId)) {
    throw new Error("Referral signing is not configured");
  }
  const payload = inviterId + "." + Math.floor(issuedAt);
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return payload + "." + signature;
}

/** @param {string | null | undefined} token @param {string | undefined} secret @param {number} [now] */
function parseInviteToken(token, secret, now = Date.now()) {
  if (!secret || secret.length < 16 || !token || token.length > 200) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [inviterId, issued, received] = parts;
  if (!/^[a-z0-9_-]{10,64}$/i.test(inviterId) || !/^\d{13}$/.test(issued) || !/^[a-f0-9]{64}$/.test(received)) return null;
  const issuedAt = Number(issued);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 30_000 || now - issuedAt > INVITE_LIFETIME_MS) return null;
  const expected = createHmac("sha256", secret).update(inviterId + "." + issued).digest();
  const provided = Buffer.from(received, "hex");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  return { inviterId, issuedAt };
}

/** Integer VND, rounded down; no reward on unpaid or non-positive transfers. */
function calculateReferralRewardVnd(paidAmountVnd) {
  if (!Number.isSafeInteger(paidAmountVnd) || paidAmountVnd <= 0) return 0;
  return Math.floor(paidAmountVnd / 10);
}

module.exports = {
  COOKIE_NAME, INVITE_LIFETIME_MS, REFERRAL_CODE_PATTERN,
  newReferralCode, createInviteToken, parseInviteToken, calculateReferralRewardVnd,
};
