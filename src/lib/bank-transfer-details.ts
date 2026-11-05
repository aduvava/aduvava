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
  fallbackQrUrl: string;
};

type BankEnvironment = Record<string, string | undefined>;

export function configuredReceivingBank(env: BankEnvironment) {
  const bankName = (env.SEPAY_BANK_GATEWAY || env.PAYMENT_BANK_NAME || "").trim().toUpperCase();
  // BIDV VA numbers may contain both digits and A-Z, unlike ordinary accounts.
  const accountNumber = (env.PAYMENT_BANK_ACCOUNT_NUMBER || "").trim().toUpperCase();
  const accountName = (env.PAYMENT_BANK_ACCOUNT_NAME || "").trim();

  // A typo here could direct customer funds to the wrong account. Fail
  // closed rather than issuing an invoice with incomplete payment details.
  if (!/^[A-Z0-9]{2,20}$/.test(bankName) ||
      !/^[A-Z0-9]{6,19}$/.test(accountNumber) ||
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

  // SePay documents VietQR's supported QR quick-link at vietqr.app/img.
  // It accepts official alphanumeric VAs. The earlier img.vietqr.io route
  // is retained strictly as a secondary image provider.
  const holder = bank.accountName.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/Đ/g, "D").replace(/đ/g, "d").toUpperCase();
  const primary = new URL("https://vietqr.app/img");
  primary.searchParams.set("acc", bank.accountNumber);
  primary.searchParams.set("bank", bank.bankName);
  primary.searchParams.set("amount", String(amount));
  primary.searchParams.set("des", reference);
  primary.searchParams.set("template", "qronly");
  primary.searchParams.set("holder", holder);

  const fallback = new URL("https://img.vietqr.io/image/" +
    bank.bankName + "-" + bank.accountNumber + "-compact2.png");
  fallback.searchParams.set("amount", String(amount));
  fallback.searchParams.set("addInfo", reference);
  fallback.searchParams.set("accountName", holder);

  return {
    ...bank, amount, transferContent: reference,
    qrUrl: primary.toString(), fallbackQrUrl: fallback.toString(),
  };
}
