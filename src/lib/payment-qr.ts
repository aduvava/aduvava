export type TransferBank = { name: string; accountNumber: string; accountHolder: string };
export function paymentQrUrl(bank: TransferBank, amount: number, reference: string) {
  const query = new URLSearchParams({ acc: bank.accountNumber, bank: bank.name, amount: String(amount), des: reference.replace(/[^A-Za-z0-9]/g, ""), template: "compact", holder: bank.accountHolder });
  return `https://vietqr.app/img?${query.toString()}`;
}
