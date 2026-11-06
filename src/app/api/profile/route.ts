import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk, readJson, requireUser } from "@/lib/api";
import { completeStudentProfileSchema, completeTeacherProfileSchema } from "@/lib/onboarding";

const profileSchema = z.object({
  grade: z.string().optional(),
  school: z.string().optional(),
  province: z.string().optional(),
  source: z.string().optional()
}).strict();

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      // Explicitly avoid returning credentials, passwordHash, OAuth tokens or
      // unrelated internal fields to the browser.
      select: {
        id: true, name: true, email: true, image: true, role: true,
        coins: true, exp: true, createdAt: true,
        equippedDashboardImageId: true, equippedAvatarFrameId: true,
        equippedNameColorId: true, equippedTitleId: true,
        equippedSubmitEffectId: true, equippedAvatarItemId: true,
        profile: true,
        subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" } },
      }
    });
    return jsonOk({ profile });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<unknown>(request);
    // Profile setup is performed after authentication, and server-side validation
    // must not rely only on the "required" inputs in the browser.
    const payload = typeof body === "object" && body !== null && "source" in body && body.source === "onboarding"
      ? (user.role === "TEACHER" ? completeTeacherProfileSchema : completeStudentProfileSchema).parse(body)
      : profileSchema.parse(body);
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
