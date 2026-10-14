import { redirect } from "next/navigation";
import { StudentDashboard } from "@/components/student-dashboard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const [inProgressAttempt, attempts, account, subjects] = await Promise.all([
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
    prisma.subject.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
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

  const dashboardRankings = [...bestByUser.values()]
    .sort((first, second) => second.score - first.score || first.durationSeconds - second.durationSeconds)
    .slice(0, 5)
    .map((item, index) => ({ rank: index + 1, name: item.name, score: item.score }));
  const rankingScope = attempts.length ? "Cá nhân hóa" : "THPTQG · Tất cả môn";

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const firstName = user.name?.trim().split(/\s+/).at(-1) ?? "bạn";
  const continueLearning = inProgressAttempt
    ? { title: inProgressAttempt.exam.title, href: `/attempts/${inProgressAttempt.id}` }
    : { title: "Tìm đề luyện tập", href: "/exams" };
  const submittedDates = new Set(
    attempts
      .map((attempt) => attempt.submittedAt)
      .filter((date): date is Date => Boolean(date))
      .map((date) => date.toISOString().slice(0, 10)),
  );
  let learningStreak = 0;
  const cursor = new Date(now);
  cursor.setUTCHours(0, 0, 0, 0);
  if (!submittedDates.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (submittedDates.has(cursor.toISOString().slice(0, 10))) {
    learningStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  const monday = new Date(now);
  const day = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  monday.setUTCHours(0, 0, 0, 0);
  const weekActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return submittedDates.has(date.toISOString().slice(0, 10));
  });

  return (
    <StudentDashboard
      firstName={firstName}
      greeting={greeting}
      dashboardImageKey={equippedDashboardImage?.imageKey ?? null}
      dashboardImageName={equippedDashboardImage?.name ?? null}
      learningStreak={learningStreak}
      weekActivity={weekActivity}
      continueLearning={continueLearning}
      subjects={subjects}
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
