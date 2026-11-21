import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";
import { readLimitedJson } from "@/lib/limited-json";
import { rateLimitOperation } from "@/lib/security-throttle";
import { assertStudyGroupOrigin, generateStudyGroupCode } from "@/lib/study-groups";

const createSchema = z.object({
  name: z.string().trim().min(3).max(80),
}).strict();

export async function POST(request: Request) {
  try {
    assertStudyGroupOrigin(request);
    const user = await requireUser();
    await rateLimitOperation(prisma, "study-group-create", user.id, request.headers);
    const payload = createSchema.parse(await readLimitedJson(request, 4 * 1024));

    const group = await prisma.$transaction(async (tx) => {
      // Lock the user to prevent simultaneous create/join requests from bypassing the limit.
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE
      `;
      if (!rows.length) throw new HttpError(401, "Vui lòng đăng nhập.");
      const memberships = await tx.studyGroupMember.count({ where: { userId: user.id } });
      if (memberships >= 20) throw new HttpError(400, "Mỗi tài khoản tham gia tối đa 20 nhóm.");

      return tx.studyGroup.create({
        data: {
          name: payload.name,
          joinCode: generateStudyGroupCode(),
          ownerId: user.id,
          members: { create: { userId: user.id } },
        },
        select: { id: true, name: true },
      });
    });

    return jsonOk({ group }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
