import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk, readJson } from "@/lib/api";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(10),
  source: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const payload = contactSchema.parse(await readJson<unknown>(request));
    const lead = await prisma.leadMessage.create({ data: payload });
    return jsonOk({ lead }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
