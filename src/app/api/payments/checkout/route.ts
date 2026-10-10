import { z } from "zod";
import { createMockCheckout } from "@/lib/mock-payment";
import { handleRouteError, jsonOk, readJson, requireUser } from "@/lib/api";

const checkoutSchema = z.object({
  planId: z.string().min(1),
  paymentMethod: z.enum(["QR", "BANK", "CARD", "EWALLET"]).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { planId, paymentMethod } = checkoutSchema.parse(await readJson<unknown>(request));
    const checkout = await createMockCheckout(user.id, planId, paymentMethod);
    return jsonOk(checkout, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
