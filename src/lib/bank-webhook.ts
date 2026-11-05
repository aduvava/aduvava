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
  // SePay sets subAccount to the matched official VA (if present).
  subAccount: z.string().max(100).nullish(),
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
  event: { accountNumber: string; subAccount?: string | null; gateway: string },
  account: string | undefined,
  gateway: string | undefined,
) {
  if (!account || !gateway) return false;
  const configured = account.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,19}$/.test(configured)) return false;
  if (event.gateway.trim().toLowerCase() !== gateway.trim().toLowerCase()) return false;
  // AccountNumber is the bank account that SePay connects; for an official
  // VA its number can instead be reported in subAccount. Require an exact
  // match to either field, never a prefix/substring match.
  return event.accountNumber.trim().toUpperCase() === configured ||
    (event.subAccount ?? "").trim().toUpperCase() === configured;
}
