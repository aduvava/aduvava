import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";
import { readLimitedJson } from "@/lib/limited-json";
import { rateLimitOperation } from "@/lib/security-throttle";
import { assertStudyGroupOrigin } from "@/lib/study-groups";

const joinSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-HJ-NP-Z2-9]{10}$/),
}).strict();

export async function POST(request: Request) {
  try {
    assertStudyGroupOrigin(request);
    const user = await requireUser();
    await rateLimitOperation(prisma, "study-group-join", user.id, request.headers);
    const { code } = joinSchema.parse(await readLimitedJson(request, 4 * 1024));

    const group = await prisma.$transaction(async (tx) => {
      // One lock per user for membership quota, one per group for capacity.
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE
      `;
      if (!rows.length) throw new HttpError(401, "Vui lòng đăng nhập.");
      const found = await tx.studyGroup.findUnique({
        where: { joinCode: code },
        select: { id: true, name: true },
      });
      if (!found) throw new HttpError(404, "Mã nhóm không tồn tại.");
      await tx.$queryRaw`SELECT "id" FROM "StudyGroup" WHERE "id" = ${found.id} FOR UPDATE`;

      const existing = await tx.studyGroupMember.findUnique({
        where: { groupId_userId: { groupId: found.id, userId: user.id } },
        select: { id: true },
      });
      if (existing) return found;

      const memberships = await tx.studyGroupMember.count({ where: { userId: user.id } });
      if (memberships >= 20) throw new HttpError(400, "Mỗi tài khoản tham gia tối đa 20 nhóm.");
      const members = await tx.studyGroupMember.count({ where: { groupId: found.id } });
      if (members >= 100) throw new HttpError(400, "Nhóm đã đủ 100 thành viên.");

      await tx.studyGroupMember.create({ data: { groupId: found.id, userId: user.id } });
      return found;
    }, { timeout: 10000 });

    return jsonOk({ group });
  } catch (error) {
    return handleRouteError(error);
  }
}
