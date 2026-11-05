import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { configuredReceivingBank, makeBankTransferDetails } from "../src/lib/bank-transfer-details";

const base = {
  SEPAY_BANK_GATEWAY: "BIDV",
  PAYMENT_BANK_ACCOUNT_NUMBER: "1234567890",
  PAYMENT_BANK_ACCOUNT_NAME: "Cao Trịnh Thanh Hiền",
};
const reference = "EDUVA-" + "A1".repeat(12);

describe("customer-facing VietQR transfer details", () => {
  it("constructs bank holder, amount, exact note and prefilled VietQR", () => {
    const bank = configuredReceivingBank(base);
    assert.ok(bank);
    const details = makeBankTransferDetails(bank, 39000, reference);
    assert.deepEqual(
      { bankName: details.bankName, accountNumber: details.accountNumber,
        accountName: details.accountName, amount: details.amount, transferContent: details.transferContent },
      { bankName: "BIDV", accountNumber: "1234567890",
        accountName: "Cao Trịnh Thanh Hiền", amount: 39000, transferContent: reference },
    );
    const url = new URL(details.qrUrl);
    assert.equal(url.hostname, "vietqr.app");
    assert.equal(url.pathname, "/img");
    assert.equal(url.searchParams.get("bank"), "BIDV");
    assert.equal(url.searchParams.get("acc"), "1234567890");
    assert.equal(url.searchParams.get("amount"), "39000");
    assert.equal(url.searchParams.get("des"), reference);
    assert.equal(url.searchParams.get("holder"), "CAO TRINH THANH HIEN");
    assert.equal(url.searchParams.get("template"), "qronly");
    const fallback = new URL(details.fallbackQrUrl);
    assert.equal(fallback.hostname, "img.vietqr.io");
    assert.equal(fallback.searchParams.get("addInfo"), reference);
  });

  it("accepts a BIDV official VA containing letters and pre-fills it in VietQR", () => {
    const va = "96247AB123";
    const bank = configuredReceivingBank({ ...base, PAYMENT_BANK_ACCOUNT_NUMBER: va.toLowerCase() });
    assert.ok(bank);
    const details = makeBankTransferDetails(bank, 39000, reference);
    assert.equal(details.accountNumber, va);
    assert.equal(new URL(details.qrUrl).searchParams.get("acc"), va);
    assert.equal(new URL(details.fallbackQrUrl).pathname, "/image/BIDV-" + va + "-compact2.png");
  });

  it("does not allow missing, blank, malformed or mismatched account configuration", () => {
    assert.equal(configuredReceivingBank({}), null);
    assert.equal(configuredReceivingBank({ ...base, PAYMENT_BANK_ACCOUNT_NAME: " " }), null);
    assert.equal(configuredReceivingBank({ ...base, PAYMENT_BANK_ACCOUNT_NUMBER: "123-456" }), null);
    assert.equal(configuredReceivingBank({ ...base, SEPAY_BANK_GATEWAY: "BDV/" }), null);
  });

  it("rejects unsafe amount and reference without producing a QR", () => {
    const bank = configuredReceivingBank(base);
    assert.ok(bank);
    assert.throws(() => makeBankTransferDetails(bank, 0, reference), /amount/);
    assert.throws(() => makeBankTransferDetails(bank, -39000, reference), /amount/);
    assert.throws(() => makeBankTransferDetails(bank, 39000, "bad order"), /reference/);
  });
});
