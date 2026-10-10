import { redirect } from "next/navigation";
import { StudentDashboard } from "@/components/student-dashboard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDashboardContent } from "@/lib/dashboard-content";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const [inProgressAttempt, attempts, account] = await Promise.all([
    prisma.attempt.findFirst({
      where: { userId: user.id, status: "IN_PROGRESS" },
      include: { exam: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.attempt.findMany({
      where: { userId: user.id, status: "SUBMITTED" },
      include: { exam: { include: { subject: true } } },
      orderBy: { submittedAt: "desc" },
      take: 30,
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { equippedDashboardImageId: true },
    }),
  ]);

  const equippedDashboardImage = account?.equippedDashboardImageId
    ? await prisma.storeItem.findFirst({
        where: {
          id: account.equippedDashboardImageId,
          category: "AVATAR",
          isActive: true,
        },
        select: { imageKey: true, name: true },
      })
    : null;

  const weakSubjectIds = Array.from(
    attempts.reduce((subjects, attempt) => {
      const ratio = attempt.maxScore > 0 ? attempt.score / attempt.maxScore : 0;
      if (ratio < 0.75) subjects.add(attempt.exam.subjectId);
      return subjects;
    }, new Set<string>()),
  );

  const attemptedExamIds = attempts.map((attempt) => attempt.examId);
  const personalizedExams = attempts.length
    ? await prisma.exam.findMany({
        where: {
          isPublished: true,
          id: { notIn: attemptedExamIds },
          ...(weakSubjectIds.length ? { subjectId: { in: weakSubjectIds } } : {}),
        },
        include: { subject: true },
        orderBy: [{ createdAt: "desc" }],
        take: 4,
      })
    : [];

  const fallbackExamLimit = Math.max(0, 4 - personalizedExams.length);
  const fallbackExams = fallbackExamLimit
    ? await prisma.exam.findMany({
        where: {
          isPublished: true,
          id: { notIn: [...attemptedExamIds, ...personalizedExams.map((exam) => exam.id)] },
          educationLevel: "THPTQG",
        },
        include: { subject: true },
        orderBy: [{ createdAt: "desc" }],
        take: fallbackExamLimit,
      })
    : [];

  const recommendedExams = [...personalizedExams, ...fallbackExams];
  const rankingAttemptWhere = attempts.length
    ? {
        status: "SUBMITTED" as const,
        submittedAt: { not: null },
        exam: {
          subjectId: {
            in: weakSubjectIds.length
              ? weakSubjectIds
              : Array.from(new Set(attempts.map((attempt) => attempt.exam.subjectId))),
          },
          educationLevel: {
            in: Array.from(new Set(attempts.map((attempt) => attempt.exam.educationLevel).filter(Boolean))) as NonNullable<
              (typeof attempts)[number]["exam"]["educationLevel"]
            >[],
          },
        },
      }
    : {
        status: "SUBMITTED" as const,
        submittedAt: { not: null },
        exam: { educationLevel: "THPTQG" as const },
      };

  const rankingAttempts = await prisma.attempt.findMany({
    where: rankingAttemptWhere,
    include: { user: true, exam: { include: { subject: true } } },
    orderBy: { submittedAt: "desc" },
    take: 500,
  });

  const bestByUser = new Map<string, { name: string; score: number; durationSeconds: number }>();
  for (const attempt of rankingAttempts) {
    const score = attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0;
    const previous = bestByUser.get(attempt.userId);
    if (!previous || score > previous.score || (score === previous.score && attempt.durationSeconds < previous.durationSeconds)) {
      bestByUser.set(attempt.userId, {
        name: attempt.user.name ?? "Học sinh Ava",
        score,
        durationSeconds: attempt.durationSeconds,
      });
    }
  }

  const demoRankings = [
    { name: "Nguyễn Minh Anh", score: 99, durationSeconds: 795 },
    { name: "Trần Gia Huy", score: 96, durationSeconds: 842 },
    { name: "Lê Khánh Linh", score: 94, durationSeconds: 925 },
    { name: "Phạm Anh Tú", score: 91, durationSeconds: 1120 },
    { name: "Vũ Hoàng Nam", score: 89, durationSeconds: 1280 },
  ];
  const dashboardRankings = [...bestByUser.values(), ...demoRankings]
    .sort((first, second) => second.score - first.score || first.durationSeconds - second.durationSeconds)
    .slice(0, 5)
    .map((item, index) => ({ rank: index + 1, name: item.name, score: item.score }));
  const rankingScope = attempts.length ? "Cá nhân hóa" : "THPTQG · Tất cả môn";

  const now = new Date();
  const dashboardContent = getDashboardContent(now);
  const hour = now.getHours();
  const greeting = hour < 11 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const firstName = user.name?.trim().split(/\s+/).at(-1) ?? "bạn";
  const continueLearning = inProgressAttempt
    ? { title: inProgressAttempt.exam.title, href: `/attempts/${inProgressAttempt.id}` }
    : { title: "Luyện đề THPTQG", href: "/thi-thptqg" };

  return (
    <StudentDashboard
      firstName={firstName}
      greeting={greeting}
      quote={dashboardContent.quote}
      currentDay={now.getDay() || 7}
      dashboardImageKey={equippedDashboardImage?.imageKey ?? "coffee"}
      dashboardImageName={equippedDashboardImage?.name ?? dashboardContent.image?.title ?? "Ảnh mặc định"}
      dashboardImageSrc={equippedDashboardImage ? null : dashboardContent.image?.src}
      dashboardImageAlt={equippedDashboardImage ? null : dashboardContent.image?.alt}
      continueLearning={continueLearning}
      exams={recommendedExams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        subject: exam.subject.name,
        durationMinutes: exam.durationMinutes,
        type: exam.type,
      }))}
      rankingScope={rankingScope}
      rankings={dashboardRankings}
    />
  );
}
