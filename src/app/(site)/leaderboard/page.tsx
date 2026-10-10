import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Leaderboard } from "@/components/leaderboard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Bảng xếp hạng | Ava",
  description: "Theo dõi thứ hạng học tập theo tuần, tháng và từng môn học.",
};

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/leaderboard");

  const [attempts, subjects, currentAccount, storeItems] = await Promise.all([
    prisma.attempt.findMany({
      where: { status: "SUBMITTED", submittedAt: { not: null } },
      select: {
        id: true,
        userId: true,
        score: true,
        maxScore: true,
        durationSeconds: true,
        submittedAt: true,
        user: {
          select: {
            name: true,
            image: true,
            equippedAvatarFrameId: true,
            equippedNameColorId: true,
            equippedTitleId: true,
            equippedAvatarItemId: true,
            profile: { select: { grade: true } },
          },
        },
        exam: { select: { educationLevel: true, subject: { select: { name: true } } } },
      },
      orderBy: { submittedAt: "desc" },
      take: 1000,
    }),
    prisma.subject.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        equippedAvatarFrameId: true,
        equippedNameColorId: true,
        equippedTitleId: true,
        equippedAvatarItemId: true,
        profile: { select: { grade: true } },
      },
    }),
    prisma.storeItem.findMany({
      where: { isActive: true },
      select: { id: true, metadata: true },
    }),
  ]);

  const storeMetadata = new Map(storeItems.map((item) => [item.id, item.metadata]));

  function metadataOf(id?: string | null) {
    const value = id ? storeMetadata.get(id) : null;
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
  }

  function cosmeticsFrom(account?: {
    equippedAvatarFrameId?: string | null;
    equippedNameColorId?: string | null;
    equippedTitleId?: string | null;
    equippedAvatarItemId?: string | null;
  } | null) {
    const frame = metadataOf(account?.equippedAvatarFrameId);
    const color = metadataOf(account?.equippedNameColorId);
    const title = metadataOf(account?.equippedTitleId);
    const avatar = metadataOf(account?.equippedAvatarItemId);
    return {
      avatarFrame: typeof frame?.frameStyle === "string" ? frame.frameStyle : null,
      nameColorClass: typeof color?.colorClass === "string" ? color.colorClass : null,
      title: typeof title?.title === "string" ? title.title : null,
      avatarStyle: typeof avatar?.avatarStyle === "string" ? avatar.avatarStyle : null,
      avatarInitials: typeof avatar?.initials === "string" ? avatar.initials : null,
      animatedAvatar: avatar?.animated === true,
    };
  }

  function normalizeGrade(grade?: string | null) {
    const gradeNumber = grade?.match(/\d+/)?.[0];
    return gradeNumber ? `Lớp ${gradeNumber}` : "Lớp 12";
  }

  function inferLevel(grade: string) {
    const gradeNumber = Number(grade.match(/\d+/)?.[0] ?? 12);
    return gradeNumber <= 9 ? "secondary" : "high-school";
  }

  function mapEducationLevel(level: string | null, grade: string) {
    if (level === "THCS") return "secondary";
    if (level === "THPT") return "high-school";
    if (level === "EXAM_10") return "grade-10";
    if (level === "THPTQG") return "national-exam";
    return inferLevel(grade);
  }

  const currentGrade = normalizeGrade(currentAccount?.profile?.grade);

  return (
    <Leaderboard
      currentUser={{
        id: user.id,
        name: user.name ?? "Học sinh Ava",
        image: user.image ?? null,
        educationLevel: inferLevel(currentGrade),
        grade: currentGrade,
        cosmetics: cosmeticsFrom(currentAccount),
      }}
      subjects={subjects.map((subject) => subject.name)}
      attempts={attempts.map((attempt) => ({
        id: attempt.id,
        userId: attempt.userId,
        userName: attempt.user.name ?? "Học sinh Ava",
        userImage: attempt.user.image,
        cosmetics: cosmeticsFrom(attempt.user),
        educationLevel: mapEducationLevel(
          attempt.exam.educationLevel,
          normalizeGrade(attempt.user.profile?.grade),
        ),
        grade:
          attempt.exam.educationLevel === "EXAM_10" || attempt.exam.educationLevel === "THPTQG"
            ? "Môn thi"
            : normalizeGrade(attempt.user.profile?.grade),
        subject: attempt.exam.subject.name,
        score: attempt.score,
        maxScore: attempt.maxScore,
        durationSeconds: attempt.durationSeconds,
        submittedAt: attempt.submittedAt!.toISOString(),
      }))}
    />
  );
}
