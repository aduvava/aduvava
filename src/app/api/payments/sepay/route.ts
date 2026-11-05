import { prisma } from "@/lib/db";
import { HttpError, handleRouteError, jsonOk } from "@/lib/api";
import { readLimitedJson } from "@/lib/limited-json";
import {
  bankEventReference, matchesReceivingAccount, sepayEventSchema, validBankWebhookKey,
} from "@/lib/bank-webhook";
import { transitionManualPayment } from "@/lib/payment-transition";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const key = process.env.SEPAY_WEBHOOK_API_KEY;
    if (!key || key.length < 32) throw new HttpError(503, "Bank webhook is not configured");
    if (!validBankWebhookKey(request.headers.get("authorization"), key)) {
      throw new HttpError(401, "Invalid webhook authorization");
    }

    const event = sepayEventSchema.parse(await readLimitedJson(request, 32_768));
    // SePay's test button sends id=0; never use it to activate a subscription.
    if (event.id === 0) return jsonOk({ success: true, matched: false, test: true });
    if (event.transferType !== "in") return jsonOk({ success: true, matched: false });
    if (!matchesReceivingAccount(
      event,
      process.env.PAYMENT_BANK_ACCOUNT_NUMBER,
      process.env.SEPAY_BANK_GATEWAY || process.env.PAYMENT_BANK_NAME,
    )) {
      throw new HttpError(400, "Unexpected receiving account");
    }

    const suffix = bankEventReference(event.content, event.code);
    if (!suffix) return jsonOk({ success: true, matched: false });

    const payment = await prisma.payment.findFirst({
      where: {
        reference: { in: ["EDUVA" + suffix, "EDUVA-" + suffix] },
        provider: "manual-bank-transfer",
      },
      select: { id: true, amount: true },
    });
    if (!payment) return jsonOk({ success: true, matched: false });
    if (payment.amount !== event.transferAmount) {
      throw new HttpError(409, "Transfer amount does not match order");
    }

    // Atomic subscription + transaction-id receipt: retries never grant twice.
    const result = await transitionManualPayment(prisma, payment.id, "PAID", String(event.id));
    return jsonOk({ success: true, matched: true, activated: result.activated });
  } catch (error) {
    return handleRouteError(error);
  }
}
