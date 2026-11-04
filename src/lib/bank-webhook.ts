import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
export function validBankWebhookKey(header: string | null, key: string | undefined) {
  if (!key || key.length < 32 || !header) return false;
  const supplied = Buffer.from(header); const expected = Buffer.from(`Apikey ${key}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
export const sepayEventSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  gateway: z.string().min(1).max(100), accountNumber: z.string().min(1).max(100),
  transferType: z.enum(["in", "out"]), transferAmount: z.number().int().positive().max(2147483647),
  content: z.string().max(20000), code: z.string().max(200).nullish(),
});
export function bankEventReference(content: string, code?: string | null) {
  const matches = [...`${content} ${code ?? ""}`.toUpperCase().matchAll(/(?:^|[^A-Z0-9])EDUVA[- ]?([A-F0-9]{24})(?![A-Z0-9])/g)];
  const references = [...new Set(matches.map(m => m[1]))];
  return references.length === 1 ? references[0] : null;
}
export function matchesReceivingAccount(event: { accountNumber: string; gateway: string }, account: string | undefined, gateway: string | undefined) {
  return Boolean(account && gateway && event.accountNumber.trim() === account.trim() && event.gateway.trim().toLowerCase() === gateway.trim().toLowerCase());
}
