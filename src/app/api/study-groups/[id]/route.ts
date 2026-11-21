import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";
import { assertStudyGroupOrigin } from "@/lib/study-groups";

// Members leave; the creator can delete the group (and revoke its shares).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertStudyGroupOrigin(request);
    const user = await requireUser();
    const { id } = await params;

    const outcome = await prisma.$transaction(async (tx) => {
      const group = await tx.studyGroup.findUnique({
        where: { id }, select: { ownerId: true },
      });
      if (!group) throw new HttpError(404, "Không tìm thấy nhóm.");
      if (group.ownerId === user.id) {
        await tx.studyGroup.delete({ where: { id } });
        return "deleted";
      }
      const removed = await tx.studyGroupMember.deleteMany({
        where: { groupId: id, userId: user.id },
      });
      if (!removed.count) throw new HttpError(403, "Bạn không thuộc nhóm này.");
      return "left";
    });

    return jsonOk({ outcome });
  } catch (error) {
    return handleRouteError(error);
  }
}
