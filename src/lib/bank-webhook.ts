import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

/** SePay API-key authentication: fail closed, compare in constant time. */
export function validBankWebhookKey(header: string | null, key: string | undefined) {
  if (!key || key.length < 32 || !header) return false;
  const supplied = Buffer.from(header, "utf8");
  const expected = Buffer.from("Apikey " + key, "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export const sepayEventSchema = z.object({
  id: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  gateway: z.string().min(1).max(100),
  accountNumber: z.string().min(1).max(100),
  transferType: z.enum(["in", "out"]),
  transferAmount: z.number().int().positive().max(2_147_483_647),
  content: z.string().max(20_000),
  code: z.string().max(200).nullish(),
});

/**
 * Payments use EDUVA- followed by 12 random hex bytes. Recognize only one
 * complete transfer reference. Never guess when multiple references appear.
 */
export function bankEventReference(content: string, code?: string | null) {
  const matches = [...(content + " " + (code ?? "")).toUpperCase()
    .matchAll(/(?:^|[^A-Z0-9])EDUVA[- ]?([A-F0-9]{24})(?![A-Z0-9])/g)];
  const references = [...new Set(matches.map((match) => match[1]))];
  return references.length === 1 ? references[0] : null;
}

export function matchesReceivingAccount(
  event: { accountNumber: string; gateway: string },
  account: string | undefined,
  gateway: string | undefined,
) {
  return Boolean(account && gateway &&
    event.accountNumber.trim() === account.trim() &&
    event.gateway.trim().toLowerCase() === gateway.trim().toLowerCase());
}
