import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FilePlus2,
  PlayCircle,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAverageScore, getCompletionRate } from "@/lib/exam-hub-stats";


async function loadTeacherQuickStats(userId: string, weekAgo: Date) {
  // An administrator also sees their OWN exams here, not every teacher's data.
  const exam = { ownerId: userId };
  const [examCount, publishedCount, allAttempts, submittedCount, weeklySubmissions] = await Promise.all([
    prisma.exam.count({ where: exam }),
    prisma.exam.count({ where: { ...exam, isPublished: true } }),
    prisma.attempt.count({ where: { exam } }),
    prisma.attempt.count({ where: { exam, status: "SUBMITTED" } }),
    prisma.attempt.count({ where: { exam, status: "SUBMITTED", submittedAt: { gte: weekAgo } } }),
  ]);
  return [
    {
      label: "Đề đã tạo",
      value: examCount.toLocaleString("vi-VN"),
      note: `${publishedCount.toLocaleString("vi-VN")} đề đã xuất bản`,
      icon: Archive,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Lượt làm bài",
      value: allAttempts.toLocaleString("vi-VN"),
      note: `${weeklySubmissions.toLocaleString("vi-VN")} lượt nộp trong 7 ngày`,
      icon: Users,
      color: "bg-orange-50 text-orange-600",
    },
    {
      label: "Tỉ lệ hoàn thành",
      value: `${getCompletionRate(submittedCount, allAttempts)}%`,
      note: `${submittedCount.toLocaleString("vi-VN")}/${allAttempts.toLocaleString("vi-VN")} lượt đã nộp`,
      icon: BarChart3,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];
}

async function loadStudentQuickStats(userId: string, weekAgo: Date) {
  const [submittedAttempts, allAttempts] = await Promise.all([
    prisma.attempt.findMany({
      where: { userId, status: "SUBMITTED" },
      select: { examId: true, score: true, maxScore: true, submittedAt: true },
    }),
    prisma.attempt.count({ where: { userId } }),
  ]);
  const completed = submittedAttempts.length;
  const distinctExams = new Set(submittedAttempts.map((attempt) => attempt.examId)).size;
  const weeklySubmissions = submittedAttempts.filter(
    (attempt) => attempt.submittedAt && attempt.submittedAt >= weekAgo,
  ).length;

  // There is no persisted class enrollment/ranking yet; don't show invented "Top 5".
  return [
    {
      label: "Đề đã luyện",
      value: distinctExams.toLocaleString("vi-VN"),
      note: `${weeklySubmissions.toLocaleString("vi-VN")} bài đã nộp trong 7 ngày`,
      icon: PlayCircle,
      color: "bg-orange-50 text-orange-600",
    },
    {
      label: "Điểm trung bình",
      value: getAverageScore(submittedAttempts).toLocaleString("vi-VN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      note: `Từ ${completed.toLocaleString("vi-VN")} bài đã nộp · thang 10`,
      icon: BarChart3,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Tỉ lệ hoàn thành",
      value: `${getCompletionRate(completed, allAttempts)}%`,
      note: `${completed.toLocaleString("vi-VN")}/${allAttempts.toLocaleString("vi-VN")} lượt đã nộp`,
      icon: Trophy,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];
}

const teacherWorkflow = [
  ["01", "Soạn đề", "Tạo câu hỏi, đáp án, thời lượng và thang điểm."],
  ["02", "Giao lớp", "Chọn lớp, đặt hạn nộp và bật nhắc học sinh."],
  ["03", "Theo dõi", "Xem bài nộp, điểm số, câu sai và tiến độ."],
];

const studentWorkflow = [
  ["01", "Chọn mục tiêu", "Ôn vào 10, THPTQG hoặc luyện theo môn học."],
  ["02", "Làm đề", "Bấm giờ, autosave và nộp bài khi hoàn thành."],
  ["03", "Sửa điểm yếu", "Xem lời giải, câu sai và đề gợi ý tiếp theo."],
];

export default async function ExamsHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/exams");

  const isTeacher = user.role === "TEACHER" || user.role === "ADMIN";
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const quickStats = isTeacher
    ? await loadTeacherQuickStats(user.id, weekAgo)
    : await loadStudentQuickStats(user.id, weekAgo);
  const workflow = isTeacher ? teacherWorkflow : studentWorkflow;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#fffdf6] px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
          Không gian đề thi
        </p>
        <h1 className="mt-2 text-2xl font-black leading-tight sm:mt-3 sm:text-5xl lg:text-6xl">
          Tạo và quản lý đề thi
        </h1>
        <div className="mx-auto mt-5 grid max-w-4xl gap-3 sm:mt-8 sm:gap-5 md:grid-cols-2">
          <Link
            href="/exams/create"
            className="group rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:rounded-[1.5rem] sm:p-6 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-200">
              <FilePlus2 className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-lg font-black sm:mt-5 sm:text-xl">Tạo đề thi mới</h2>
            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
              Soạn đề thủ công hoặc tạo nhanh từ ngân hàng câu hỏi, cấu hình thời gian, đáp án và quyền truy cập.
            </p>
            <span className="mt-3 inline-flex items-center gap-2 text-sm font-black sm:mt-5 text-orange-600">
              Bắt đầu tạo đề <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/exams/my"
            className="group rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:rounded-[1.5rem] sm:p-6 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-100">
              <Archive className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-xl font-black">Kho đề thi của bạn</h2>
            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
              Xem lại đề đã tạo, chỉnh sửa nội dung, sao chép link chia sẻ và quản lý trạng thái xuất bản.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-600">
              Mở kho đề <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </div>

        <section className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 md:grid-cols-3">
          {quickStats.map(({ label, value, note, icon: Icon, color }) => (
            <article key={label} className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:rounded-[1.75rem] sm:p-5">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${color}`}>
                <Icon className="h-6 w-6" />
              </span>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{note}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:mt-8 sm:gap-6 sm:rounded-[2rem] sm:p-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-orange-200">
              {isTeacher ? <ShieldCheck className="h-6 w-6" /> : <Trophy className="h-6 w-6" />}
            </span>
            <h2 className="mt-5 text-2xl font-black">
              {isTeacher ? "Quản lí đề thi rõ ràng hơn" : "Luyện đề có chiến lược hơn"}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
              {isTeacher
                ? "Mỗi đề có thông số, trạng thái, lịch giao bài và kết quả nộp bài để giáo viên theo dõi nhanh."
                : "Mỗi lần làm đề đều được lưu kết quả, chỉ ra câu sai và gợi ý phần cần luyện tiếp."}
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-orange-100">
              <Clock3 className="h-4 w-4" /> {isTeacher ? "Nhắc hạn nộp và tự động tổng hợp bài nộp" : "Theo dõi thời gian, điểm số và EXP sau mỗi bài"}
            </div>
          </div>

          <div className="grid gap-3">
            {workflow.map(([step, title, text]) => (
              <div key={step} className="flex items-center gap-4 rounded-2xl bg-orange-50/60 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-orange-500 shadow-sm">{step}</span>
                <div>
                  <p className="font-black text-slate-950">{title}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{text}</p>
                </div>
                <CheckCircle2 className="ml-auto hidden h-5 w-5 text-emerald-500 sm:block" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
