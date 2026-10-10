import { z } from "zod";
import { prisma } from "@/lib/db";
import { createMockEssayFeedback } from "@/lib/mock-ai";
import { handleRouteError, jsonOk, readJson, requireUser } from "@/lib/api";

const feedbackSchema = z.object({
  prompt: z.string().min(5),
  answer: z.string().min(10),
  rubric: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = feedbackSchema.parse(await readJson<unknown>(request));
    const output = await createMockEssayFeedback(payload);
    const feedback = await prisma.aiFeedback.create({ data: { userId: user.id, type: "essay-feedback", input: payload, output } });
    return jsonOk({ feedback, output }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
