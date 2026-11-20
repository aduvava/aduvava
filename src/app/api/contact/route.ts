import { readLimitedJson } from "@/lib/limited-json";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimitOperation } from "@/lib/security-throttle";
import { handleRouteError, jsonOk } from "@/lib/api";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(10).max(5000),
  // Anonymous contact forms may not impersonate authenticated privacy/moderation tickets.
  source: z.enum(["website", "service-page"]).optional()
});

export async function POST(request: Request) {
  try {
    const payload = contactSchema.parse(await readLimitedJson(request, 32768));
    await rateLimitOperation(prisma, "contact", payload.email, request.headers);
    const lead = await prisma.leadMessage.create({ data: payload });
    return jsonOk({ id: lead.id, message: "Cảm ơn bạn đã liên hệ." }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
