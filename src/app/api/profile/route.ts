import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk, readJson, requireUser } from "@/lib/api";

const profileSchema = z.object({
  grade: z.string().optional(),
  school: z.string().optional(),
  province: z.string().optional(),
  aspiration: z.string().optional(),
  targetScore: z.string().optional(),
  source: z.string().optional()
});

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true, subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" } } }
    });
    return jsonOk({ profile });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = profileSchema.parse(await readJson<unknown>(request));
    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: payload,
      create: { userId: user.id, ...payload }
    });
    return jsonOk({ profile });
  } catch (error) {
    return handleRouteError(error);
  }
}
