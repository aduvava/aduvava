import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bankEventReference, matchesReceivingAccount, sepayEventSchema, validBankWebhookKey,
} from "../src/lib/bank-webhook";

const key = "q".repeat(40);
const suffix = "A1B2C3D4E5F60123456789AB";

describe("SePay webhook authentication and matching", () => {
  it("rejects missing, short, incorrect and malformed API keys", () => {
    assert.equal(validBankWebhookKey("Apikey " + key, key), true);
    assert.equal(validBankWebhookKey("Apikey " + key, ""), false);
    assert.equal(validBankWebhookKey("Apikey " + key, "short"), false);
    assert.equal(validBankWebhookKey("Bearer " + key, key), false);
    assert.equal(validBankWebhookKey("Apikey " + key + "x", key), false);
    assert.equal(validBankWebhookKey(null, key), false);
  });

  it("recognizes exactly one complete EDUVA reference, or rejects ambiguity", () => {
    assert.equal(bankEventReference("Chuyen khoan EDUVA-" + suffix), suffix);
    assert.equal(bankEventReference("EDUVA" + suffix.toLowerCase()), suffix);
    assert.equal(bankEventReference("unrelated", "EDUVA-" + suffix), suffix);
    assert.equal(bankEventReference("PREFIXEDUVA-" + suffix), null);
    assert.equal(bankEventReference("EDUVA-" + suffix + "Z"), null);
    assert.equal(bankEventReference("EDUVA-" + suffix + " EDUVA-" + "F".repeat(24)), null);
    assert.equal(bankEventReference("No reference"), null);
  });

  it("matches only the configured receiving account and bank", () => {
    const event = { accountNumber: "123456789", gateway: "BIDV" };
    assert.equal(matchesReceivingAccount(event, "123456789", "bidv"), true);
    assert.equal(matchesReceivingAccount(event, "123456780", "BIDV"), false);
    assert.equal(matchesReceivingAccount(event, "123456789", "VCB"), false);
    assert.equal(matchesReceivingAccount(event, undefined, "BIDV"), false);
  });

  it("validates actual SePay transfer fields and rejects invalid amounts", () => {
    const sample = {
      id: 2026, gateway: "BIDV", accountNumber: "123456789",
      transferType: "in", transferAmount: 100000,
      content: "Thanh toan EDUVA-" + suffix, code: null,
    };
    assert.equal(sepayEventSchema.safeParse(sample).success, true);
    assert.equal(sepayEventSchema.safeParse({ ...sample, transferType: "out" }).success, true);
    assert.equal(sepayEventSchema.safeParse({ ...sample, transferAmount: -1 }).success, false);
    assert.equal(sepayEventSchema.safeParse({ ...sample, id: "2026" }).success, false);
  });
});
