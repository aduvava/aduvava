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

const teacherQuickStats = [
  { label: "Đề đã tạo", value: "63", note: "12 đề đang dùng", icon: Archive, color: "bg-blue-50 text-blue-600" },
  { label: "Lượt làm bài", value: "1.2K", note: "Tăng 18% tuần này", icon: Users, color: "bg-orange-50 text-orange-600" },
  { label: "Tỉ lệ hoàn thành", value: "86%", note: "Theo các lớp đang học", icon: BarChart3, color: "bg-emerald-50 text-emerald-600" },
];

const studentQuickStats = [
  { label: "Đề đã luyện", value: "28", note: "6 đề trong tuần này", icon: PlayCircle, color: "bg-orange-50 text-orange-600" },
  { label: "Điểm trung bình", value: "8.4", note: "+0.6 so với tháng trước", icon: BarChart3, color: "bg-blue-50 text-blue-600" },
  { label: "Xếp hạng lớp", value: "Top 5", note: "Còn 120 EXP để lên hạng", icon: Trophy, color: "bg-emerald-50 text-emerald-600" },
];

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
  const quickStats = isTeacher ? teacherQuickStats : studentQuickStats;
  const workflow = isTeacher ? teacherWorkflow : studentWorkflow;

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fffdf6] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
          Không gian đề thi
        </p>
        <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
          Tạo và quản lý đề thi
        </h1>
        <div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-2">
          <Link
            href="/exams/create"
            className="group rounded-[1.5rem] border border-orange-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-200">
              <FilePlus2 className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-xl font-black">Tạo đề thi mới</h2>
            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
              Soạn đề thủ công hoặc tạo nhanh từ ngân hàng câu hỏi, cấu hình thời gian, đáp án và quyền truy cập.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-orange-600">
              Bắt đầu tạo đề <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/exams/my"
            className="group rounded-[1.5rem] border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
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

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {quickStats.map(({ label, value, note, icon: Icon, color }) => (
            <article key={label} className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${color}`}>
                <Icon className="h-6 w-6" />
              </span>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{note}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm lg:grid-cols-[0.85fr_1.15fr]">
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
