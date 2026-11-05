import { z } from "zod";
import { createManualCheckout } from "@/lib/manual-payment";
import { prisma } from "@/lib/db";
import { rateLimitOperation } from "@/lib/security-throttle";
import { handleRouteError, jsonOk, readJson, requireUser } from "@/lib/api";

const checkoutSchema = z.object({
  planId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { planId } = checkoutSchema.parse(await readJson<unknown>(request));
    const checkout = await createManualCheckout(
      user.id, planId,
      () => rateLimitOperation(prisma, "checkout", user.id, request.headers),
    );
    return jsonOk(checkout, checkout.reusedPending ? 200 : 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
