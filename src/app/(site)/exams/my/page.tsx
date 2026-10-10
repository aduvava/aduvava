import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MyExamLibrary } from "@/components/my-exam-library";

export default async function MyExamsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/exams/my");

  const exams = await prisma.exam.findMany({
    where: { ownerId: user.id },
    include: {
      subject: { select: { name: true } },
      accessGrants: { select: { email: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fffdf6] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/exams" className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-orange-600">
              <ArrowLeft className="h-5 w-5" /> Quay lại mục đề thi
            </Link>
            <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-orange-500">Kho cá nhân</p>
            <h1 className="mt-2 text-4xl font-black sm:text-5xl">Kho đề thi của bạn</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Quản lý đề đã tạo, sao chép link chia sẻ, đặt mật khẩu và cấp quyền truy cập cho học sinh hoặc đồng đội.
            </p>
          </div>
          <Link href="/exams/create" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 hover:bg-orange-600">
            <FilePlus2 className="h-4 w-4" /> Tạo đề mới
          </Link>
        </div>

        <div className="mt-8">
          <MyExamLibrary
            exams={exams.map((exam) => ({
              id: exam.id,
              title: exam.title,
              subjectName: exam.subject.name,
              durationMinutes: exam.durationMinutes,
              questionCount: exam._count.questions,
              attemptCount: exam._count.attempts,
              shareMode: exam.shareMode,
              shareToken: exam.shareToken,
              accessEmails: exam.accessGrants.map((grant) => grant.email).filter(Boolean) as string[],
              createdAt: exam.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </main>
  );
}
