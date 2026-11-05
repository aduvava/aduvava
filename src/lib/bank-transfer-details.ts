/**
 * Render bank details solely from server configuration. This public checkout
 * payload must never include bank-webhook secrets or SSH/environment keys.
 */
export type BankTransferDetails = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  transferContent: string;
  qrUrl: string;
};

export function configuredReceivingBank(env: NodeJS.ProcessEnv) {
  const bankName = (env.SEPAY_BANK_GATEWAY || env.PAYMENT_BANK_NAME || "").trim().toUpperCase();
  const accountNumber = (env.PAYMENT_BANK_ACCOUNT_NUMBER || "").trim();
  const accountName = (env.PAYMENT_BANK_ACCOUNT_NAME || "").trim();

  // A typo here could direct customer funds to the wrong account. Fail
  // closed rather than issuing an invoice with incomplete payment details.
  if (!/^[A-Z0-9]{2,20}$/.test(bankName) ||
      !/^[0-9]{6,19}$/.test(accountNumber) ||
      accountName.length < 2 || accountName.length > 100) {
    return null;
  }
  return { bankName, accountNumber, accountName };
}

export function makeBankTransferDetails(
  bank: NonNullable<ReturnType<typeof configuredReceivingBank>>,
  amount: number,
  reference: string,
): BankTransferDetails {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid bank transfer amount");
  if (!/^EDUVA-[A-F0-9]{24}$/.test(reference)) throw new Error("Invalid payment reference");

  // Quick Link is used only for the QR IMAGE; SePay independently verifies
  // incoming money. accountName is a visual label, not proof of ownership.
  const url = new URL("https://img.vietqr.io/image/" +
    bank.bankName + "-" + bank.accountNumber + "-compact2.png");
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("addInfo", reference);
  url.searchParams.set("accountName", bank.accountName.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/Đ/g, "D").replace(/đ/g, "d").toUpperCase());

  return { ...bank, amount, transferContent: reference, qrUrl: url.toString() };
}
