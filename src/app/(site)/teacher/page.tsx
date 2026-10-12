import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeacherDashboard, type TeacherTab } from "@/components/teacher-dashboard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Trang chủ giáo viên | Ava",
  description: "Quản lý lớp học, đề thi, báo cáo và tài liệu giảng dạy.",
};

const validTabs = new Set<TeacherTab>(["overview", "classes", "exams", "reports", "documents"]);

export default async function TeacherPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=teacher&callbackUrl=/teacher");
  if (user.role !== "TEACHER" && user.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const requestedTab = params.tab as TeacherTab | undefined;
  const initialTab = requestedTab && validTabs.has(requestedTab) ? requestedTab : "overview";

  const ownedExamWhere = user.role === "ADMIN" ? {} : { ownerId: user.id };
  const ownedDocumentWhere = user.role === "ADMIN" ? {} : { uploaderId: user.id };
  const [attempts, examCount, documentCount, recentExams, recentDocuments] = await Promise.all([
    prisma.attempt.findMany({
      where: { exam: ownedExamWhere },
      select: { userId: true, status: true, score: true, maxScore: true, submittedAt: true },
    }),
    prisma.exam.count({ where: ownedExamWhere }),
    prisma.document.count({ where: { ...ownedDocumentWhere, status: "APPROVED" } }),
    prisma.exam.findMany({
      where: ownedExamWhere,
      include: { subject: { select: { name: true } }, _count: { select: { attempts: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.document.findMany({
      where: { ...ownedDocumentWhere, status: "APPROVED" },
      select: { id: true, title: true, subject: true, downloads: true, type: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const submittedAttempts = attempts.filter((attempt) => attempt.status === "SUBMITTED");
  const studentCount = new Set(attempts.map((attempt) => attempt.userId)).size;
  const submittedCount = submittedAttempts.length;
  const averageScore = submittedAttempts.length
    ? submittedAttempts.reduce(
        (total, attempt) => total + (attempt.maxScore > 0 ? (attempt.score / attempt.maxScore) * 10 : 0),
        0,
      ) / submittedAttempts.length
    : 0;
  const completionRate = attempts.length ? Math.round((submittedCount / attempts.length) * 100) : 0;
  const monday = new Date();
  const currentDay = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - currentDay + 1);
  monday.setUTCHours(0, 0, 0, 0);
  const weeklySubmissions = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(monday);
    start.setUTCDate(monday.getUTCDate() + index);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 1);
    return submittedAttempts.filter(
      (attempt) => attempt.submittedAt && attempt.submittedAt >= start && attempt.submittedAt < end,
    ).length;
  });

  return (
    <TeacherDashboard
      initialTab={initialTab}
      teacherName={user.name ?? "Giáo viên Ava"}
      stats={{ studentCount, examCount, submittedCount, documentCount }}
      report={{ averageScore, completionRate, activeStudents: studentCount, weeklySubmissions }}
      exams={recentExams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        subject: exam.subject.name,
        duration: exam.durationMinutes,
        submissions: exam._count.attempts,
        published: exam.isPublished,
      }))}
      documents={recentDocuments.map((document) => ({
        id: document.id,
        title: document.title,
        subject: document.subject,
        downloads: document.downloads,
        type: document.type,
      }))}
    />
  );
}
