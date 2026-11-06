import { prisma } from "@/lib/db";
import { configuredReceivingBank } from "@/lib/bank-transfer-details";
import { handleRouteError, jsonOk, requireAdmin } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnostics for administrators. Never expose the API key, account number,
// transfer tokens or raw bank event payloads to the browser.
export async function GET() {
  try {
    await requireAdmin();
    const lastReceipt = await prisma.sePayReceipt.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return jsonOk({
      apiKeyConfigured: Boolean(process.env.SEPAY_WEBHOOK_API_KEY &&
        process.env.SEPAY_WEBHOOK_API_KEY.length >= 32),
      receivingAccountConfigured: Boolean(configuredReceivingBank(process.env)),
      lastSuccessfulAutoPaymentAt: lastReceipt?.createdAt ?? null,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
