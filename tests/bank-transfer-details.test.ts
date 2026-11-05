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
    const bank = configuredReceivingBank(base as NodeJS.ProcessEnv);
    assert.ok(bank);
    const details = makeBankTransferDetails(bank, 39000, reference);
    assert.deepEqual(
      { bankName: details.bankName, accountNumber: details.accountNumber,
        accountName: details.accountName, amount: details.amount, transferContent: details.transferContent },
      { bankName: "BIDV", accountNumber: "1234567890",
        accountName: "Cao Trịnh Thanh Hiền", amount: 39000, transferContent: reference },
    );
    const url = new URL(details.qrUrl);
    assert.equal(url.hostname, "img.vietqr.io");
    assert.equal(url.pathname, "/image/BIDV-1234567890-compact2.png");
    assert.equal(url.searchParams.get("amount"), "39000");
    assert.equal(url.searchParams.get("addInfo"), reference);
    assert.equal(url.searchParams.get("accountName"), "CAO TRINH THANH HIEN");
  });

  it("does not allow missing, blank, malformed or mismatched account configuration", () => {
    assert.equal(configuredReceivingBank({} as NodeJS.ProcessEnv), null);
    assert.equal(configuredReceivingBank({ ...base, PAYMENT_BANK_ACCOUNT_NAME: " " } as NodeJS.ProcessEnv), null);
    assert.equal(configuredReceivingBank({ ...base, PAYMENT_BANK_ACCOUNT_NUMBER: "123-456" } as NodeJS.ProcessEnv), null);
    assert.equal(configuredReceivingBank({ ...base, SEPAY_BANK_GATEWAY: "BDV/" } as NodeJS.ProcessEnv), null);
  });

  it("rejects unsafe amount and reference without producing a QR", () => {
    const bank = configuredReceivingBank(base as NodeJS.ProcessEnv);
    assert.ok(bank);
    assert.throws(() => makeBankTransferDetails(bank, 0, reference), /amount/);
    assert.throws(() => makeBankTransferDetails(bank, -39000, reference), /amount/);
    assert.throws(() => makeBankTransferDetails(bank, 39000, "bad order"), /reference/);
  });
});
