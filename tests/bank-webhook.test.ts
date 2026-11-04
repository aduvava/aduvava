import { it } from "node:test";
import assert from "node:assert/strict";
import { bankEventReference, matchesReceivingAccount, sepayEventSchema, validBankWebhookKey } from "../src/lib/bank-webhook";
import { paymentQrUrl } from "../src/lib/payment-qr";
const key = "test-secret-for-webhook-authentication-123456";
const suffix = "0123456789ABCDEF01234567";
it("webhook rejects absent, incorrect and weak credentials", () => {
 assert.equal(validBankWebhookKey(`Apikey ${key}`, key), true);
 for (const header of [null, "", key, `Bearer ${key}`, `Apikey ${key}x`, `Apikey ${key.toUpperCase()}`]) assert.equal(validBankWebhookKey(header, key), false);
 assert.equal(validBankWebhookKey("Apikey short", "short"), false);
 assert.equal(validBankWebhookKey(`Apikey ${key}`, undefined), false);
});
it("only the exact receiving account and configured gateway match", () => {
 assert.equal(matchesReceivingAccount({ accountNumber: "123", gateway: "BIDV" }, "123", "bidv"), true);
 assert.equal(matchesReceivingAccount({ accountNumber: "1234", gateway: "BIDV" }, "123", "BIDV"), false);
 assert.equal(matchesReceivingAccount({ accountNumber: "123", gateway: "ACB" }, "123", "BIDV"), false);
 assert.equal(matchesReceivingAccount({ accountNumber: "123", gateway: "BIDV" }, undefined, "BIDV"), false);
});
it("extracts one complete random order reference, including legacy separators", () => {
 for (const content of [`transfer EDUVA${suffix} thanks`, `EDUVA-${suffix}`, `eduva ${suffix.toLowerCase()}`]) assert.equal(bankEventReference(content), suffix);
 assert.equal(bankEventReference(`EDUVA${suffix}`, `EDUVA${suffix}`), suffix);
 for (const content of [`EDUVA${suffix}9`, `XEDUVA${suffix}`, "EDUVA1234", `EDUVA${suffix} EDUVAFFFFFFFFFFFFFFFFFFFFFFFF`]) assert.equal(bankEventReference(content), null);
});
it("rejects fractional, negative and unsafe transaction values", () => {
 const valid = { id: 123, gateway: "BIDV", accountNumber: "123", transferType: "in", transferAmount: 39000, content: `EDUVA${suffix}`, code: null };
 assert.equal(sepayEventSchema.safeParse(valid).success, true);
 for (const patch of [{ id: 0 }, { id: Number.MAX_SAFE_INTEGER + 1 }, { transferAmount: -1 }, { transferAmount: 39000.1 }, { transferType: "unknown" }]) assert.equal(sepayEventSchema.safeParse({ ...valid, ...patch }).success, false);
});
it("QR carries the exact account, amount and reference using encoded query parameters", () => {
 const url = new URL(paymentQrUrl({ name: "BIDV", accountNumber: "123", accountHolder: "TEST HOLDER" }, 39000, `EDUVA-${suffix}`));
 assert.equal(url.origin, "https://vietqr.app"); assert.equal(url.searchParams.get("acc"), "123"); assert.equal(url.searchParams.get("amount"), "39000"); assert.equal(url.searchParams.get("des"), `EDUVA${suffix}`); assert.equal(url.searchParams.get("holder"), "TEST HOLDER");
});
