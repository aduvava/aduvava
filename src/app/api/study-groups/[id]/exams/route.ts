import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";
import { readLimitedJson } from "@/lib/limited-json";
import { rateLimitOperation } from "@/lib/security-throttle";
import { assertStudyGroupOrigin } from "@/lib/study-groups";
import { canRemoveGroupExam, isShareablePersonalExam } from "@/lib/study-group-policy";

const examSchema = z.object({ examId: z.string().min(1).max(128) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertStudyGroupOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    await rateLimitOperation(prisma, "study-group-share", user.id, request.headers);
    const { examId } = examSchema.parse(await readLimitedJson(request, 4 * 1024));

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "StudyGroup" WHERE "id" = ${id} FOR UPDATE`;
      const member = await tx.studyGroupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: user.id } },
        select: { id: true },
      });
      if (!member) throw new HttpError(403, "Bạn không thuộc nhóm này.");
      const exam = await tx.exam.findUnique({
        where: { id: examId },
        select: { id: true, ownerId: true, isPublished: true, code: true },
      });
      if (!isShareablePersonalExam(exam, user.id)) {
        throw new HttpError(403, "Bạn chỉ được chia sẻ đề cá nhân do mình tạo.");
      }
      const alreadyShared = await tx.studyGroupExam.findUnique({
        where: { groupId_examId: { groupId: id, examId } },
      });
      if (alreadyShared) return;
      const count = await tx.studyGroupExam.count({ where: { groupId: id } });
      if (count >= 200) throw new HttpError(400, "Kho nhóm đã đạt giới hạn 200 đề.");
      await tx.studyGroupExam.create({
        data: { groupId: id, examId, sharedById: user.id },
      });
    });

    return jsonOk({ ok: true }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertStudyGroupOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const { examId } = examSchema.parse(await readLimitedJson(request, 4 * 1024));
    const group = await prisma.studyGroup.findUnique({ where: { id }, select: { ownerId: true } });
    if (!group) throw new HttpError(404, "Không tìm thấy nhóm.");
    const membership = await prisma.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: user.id } },
    });
    if (!membership) throw new HttpError(403, "Bạn không thuộc nhóm này.");
    const share = await prisma.studyGroupExam.findUnique({
      where: { groupId_examId: { groupId: id, examId } },
      select: { sharedById: true },
    });
    if (!share) throw new HttpError(404, "Không tìm thấy đề trong nhóm.");
    if (!canRemoveGroupExam(user.id, group.ownerId, share.sharedById)) {
      throw new HttpError(403, "Chỉ chủ nhóm hoặc người chia sẻ được gỡ đề.");
    }
    await prisma.studyGroupExam.deleteMany({ where: { groupId: id, examId } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
