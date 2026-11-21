import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StudyGroupWorkspace } from "@/components/study-group-workspace";

export default async function StudyGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) redirect(`/login?callbackUrl=/nhom-hoc/${id}`);

  const membership = await prisma.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
    select: { id: true },
  });
  if (!membership) notFound();

  const [group, myExams] = await Promise.all([
    prisma.studyGroup.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { joinedAt: "asc" },
          select: { user: { select: { id: true, name: true } } },
        },
        exams: {
          orderBy: { createdAt: "desc" },
          include: {
            exam: {
              select: {
                id: true, title: true, durationMinutes: true, isPublished: true,
                subject: { select: { name: true } },
                _count: { select: { questions: true } },
              },
            },
            sharedBy: { select: { name: true } },
          },
        },
      },
    }),
    prisma.exam.findMany({
      where: { ownerId: user.id, isPublished: true, code: { startsWith: "USER-" } },
      select: { id: true, title: true, subject: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  if (!group) notFound();

  return <StudyGroupWorkspace
    group={{
      id: group.id,
      name: group.name,
      joinCode: group.joinCode,
      isOwner: group.ownerId === user.id,
      currentUserId: user.id,
      members: group.members.map((m) => ({ id: m.user.id, name: m.user.name || "Thành viên Educhi" })),
      exams: group.exams.filter((e) => e.exam.isPublished).map((share) => ({
        id: share.exam.id,
        title: share.exam.title,
        subject: share.exam.subject.name,
        duration: share.exam.durationMinutes,
        questions: share.exam._count.questions,
        sharedBy: share.sharedBy.name || "Thành viên Educhi",
        canRemove: group.ownerId === user.id || share.sharedById === user.id,
      })),
    }}
    myExams={myExams.map((exam) => ({ id: exam.id, title: exam.title, subject: exam.subject.name }))}
  />;
}
