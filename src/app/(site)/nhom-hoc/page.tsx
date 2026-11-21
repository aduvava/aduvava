import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StudyGroupsHub } from "@/components/study-groups-hub";

export default async function StudyGroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/nhom-hoc");

  const memberships = await prisma.studyGroupMember.findMany({
    where: { userId: user.id },
    include: {
      group: {
        select: {
          id: true, name: true, ownerId: true,
          _count: { select: { members: true, exams: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <StudyGroupsHub
      groups={memberships.map(({ group }) => ({
        id: group.id,
        name: group.name,
        isOwner: group.ownerId === user.id,
        members: group._count.members,
        exams: group._count.exams,
      }))}
    />
  );
}
