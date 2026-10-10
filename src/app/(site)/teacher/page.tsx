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

  const [studentCount, examCount, submittedCount, documentCount, recentExams, recentDocuments] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.exam.count(),
    prisma.attempt.count({ where: { status: "SUBMITTED" } }),
    prisma.document.count({ where: { status: "APPROVED" } }),
    prisma.exam.findMany({
      include: { subject: { select: { name: true } }, _count: { select: { attempts: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.document.findMany({
      where: { status: "APPROVED" },
      select: { id: true, title: true, subject: true, downloads: true, type: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <TeacherDashboard
      initialTab={initialTab}
      teacherName={user.name ?? "Giáo viên Ava"}
      stats={{ studentCount, examCount, submittedCount, documentCount }}
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
