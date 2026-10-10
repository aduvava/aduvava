import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  FileText,
  GraduationCap,
  Layers3,
  Medal,
  School,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { MascotAvatar } from "@/components/mascot-avatar";

const coreFeatures = [
  {
    icon: FileText,
    title: "Kho đề theo cấp học",
    text: "THCS, THPT, ôn thi vào 10 và THPTQG được tách rõ theo lớp, môn, chuyên đề và kỳ thi.",
  },
  {
    icon: CheckCircle2,
    title: "Làm bài, autosave, chấm điểm",
    text: "Bài làm được tự động lưu, tính giờ và trả kết quả ngay sau khi nộp để học sinh biết mình đang yếu ở đâu.",
  },
  {
    icon: BarChart3,
    title: "Gợi ý cá nhân hóa",
    text: "Khi có dữ liệu học tập, hệ thống ưu tiên đề, bảng xếp hạng và lộ trình phù hợp với từng học sinh.",
  },
  {
    icon: BookOpen,
    title: "Tài liệu học tập",
    text: "Tìm, xem trước, tải xuống và chia sẻ tài liệu. Tài liệu tốt có thể nhận EXP sau khi được duyệt.",
  },
  {
    icon: Medal,
    title: "EXP và cửa hàng",
    text: "EXP tích lũy khi học chăm và dùng để đổi vật phẩm, ảnh đại diện hoặc giao diện học tập.",
  },
  {
    icon: Users,
    title: "Lớp học trực tuyến",
    text: "Học sinh tham gia lớp, theo dõi bài tập, nhận thông báo và kết nối với giáo viên trong cùng một nơi.",
  },
];

const teacherFeatures = [
  "Tạo và quản lý lớp học",
  "Soạn đề thi nhanh hoặc thủ công",
  "Theo dõi bài nộp, điểm số, tiến độ",
  "Quản lý tài liệu và báo cáo học tập",
];

const learningSteps = [
  ["01", "Chọn mục tiêu", "Lớp 6-12, ôn vào 10 hoặc THPTQG."],
  ["02", "Luyện đề", "Làm bài theo chuyên đề, kỳ thi hoặc lý thuyết."],
  ["03", "Xem kết quả", "Biết điểm, thời gian, câu sai và lời giải."],
  ["04", "Tiến bộ", "Nhận đề gợi ý, tích EXP và leo bảng xếp hạng."],
];

const platformStats = [
  { icon: GraduationCap, value: "100K+", label: "Học viên tin tưởng", tone: "bg-orange-50 text-orange-500" },
  { icon: BookOpen, value: "1K+", label: "Đề thi thử", tone: "bg-slate-950 text-white" },
  { icon: Target, value: "24/7", label: "AI hỗ trợ học tập", tone: "bg-blue-50 text-blue-500" },
  { icon: Bot, value: "AI", label: "Gợi ý thông minh", tone: "bg-emerald-50 text-emerald-500" },
];

export default function HomePage() {
  return (
    <main className="hide-site-header overflow-hidden bg-[#fffaf0] text-slate-950">
      <section id="gioi-thieu" className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(251,146,60,0.18),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(255,237,213,0.9),transparent_32%),linear-gradient(180deg,#fffaf0,#fffdf8)]" />
        <div className="relative mx-auto grid max-w-[1440px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-orange-600">
              <Sparkles className="h-4 w-4" />
              Nền tảng học tập Ava
            </span>
            <h1 className="mt-7 max-w-5xl text-5xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              <span className="block whitespace-nowrap">Luyện Đề Thông Minh</span>
              <span className="mt-3 block text-orange-500">Tự Tin Vượt Ải Cùng Ava</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-600">
              Ava tự hào là nền tảng biến việc học thành niềm vui. Học sinh thỏa sức luyện đề chinh phục các kì thi quan trọng, xem lời giải chi tiết, khắc phục điểm yếu và đua top EXP. Về phía giáo viên, Ava mang đến một không gian làm việc tối ưu để tạo bài tập, quản lý học viên và đánh giá năng lực dễ dàng.
            </p>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
              <Link href="/login?role=student&callbackUrl=/dashboard" className="inline-flex items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-[0_16px_35px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 hover:bg-orange-600">
                <GraduationCap className="h-5 w-5" />
                Tôi là Học sinh
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login?role=teacher&callbackUrl=/teacher" className="inline-flex items-center justify-center gap-3 rounded-2xl border border-orange-200 bg-white px-6 py-4 text-sm font-black text-orange-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-50">
                <School className="h-5 w-5" />
                Tôi là Giáo viên
              </Link>
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ["100+", "đề luyện"],
                ["12", "môn học"],
                ["24/7", "autosave"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-orange-100 bg-white/80 px-4 py-4 shadow-sm">
                  <p className="text-2xl font-black text-orange-500">{value}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[520px]">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-orange-300/25 blur-3xl" />
            <div className="relative rounded-[2.5rem] border border-orange-100 bg-white p-5 shadow-[0_25px_80px_rgba(84,48,20,0.12)]">
              <div className="rounded-[2rem] bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500 p-6 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-100">Bảng điều khiển học tập</p>
                    <h2 className="mt-3 text-3xl font-black">Xin chào, bạn đã sẵn sàng chưa?</h2>
                  </div>
                  <span className="grid h-16 w-16 place-items-center rounded-3xl bg-white p-2">
                    <MascotAvatar />
                  </span>
                </div>
                <div className="mt-7 grid grid-cols-3 gap-3">
                  {[
                    [Trophy, "Top tuần"],
                    [Medal, "EXP"],
                    [Medal, "Thành tích"],
                  ].map(([Icon, label]) => (
                    <div key={String(label)} className="rounded-2xl bg-white/16 p-4 backdrop-blur">
                      <Icon className="h-5 w-5" />
                      <p className="mt-3 text-sm font-black">{String(label)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {learningSteps.map(([step, title, text]) => (
                  <div key={step} className="flex items-center gap-4 rounded-3xl border border-orange-100 bg-orange-50/50 p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-orange-500 shadow-sm">
                      {step}
                    </span>
                    <div>
                      <p className="font-black text-slate-900">{title}</p>
                      <p className="mt-0.5 text-sm font-medium text-slate-500">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-500">
                  <Bot className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-black text-slate-900">Gợi ý thông minh</p>
                  <p className="mt-1 text-sm text-slate-500">Đề ôn tập phù hợp với dữ liệu học tập của bạn.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-white/70 px-4 py-10 shadow-[inset_0_1px_0_rgba(251,146,60,0.12),inset_0_-1px_0_rgba(251,146,60,0.08)] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {platformStats.map(({ icon: Icon, value, label, tone }) => (
            <div key={label} className="flex items-center gap-5 rounded-[2rem] border border-orange-100/80 bg-white px-5 py-6 shadow-[0_14px_40px_rgba(72,48,26,0.06)]">
              <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-3xl ${tone}`}>
                <Icon className="h-8 w-8" />
              </span>
              <div>
                <p className="text-4xl font-black tracking-tight text-slate-950">{value}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="tinh-nang" className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">Tính năng nổi bật</span>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Một nơi cho toàn bộ việc học</h2>
          <p className="mt-4 text-base font-medium leading-7 text-slate-600">
            Từ luyện đề, xem tài liệu, tham gia lớp học đến theo dõi bảng xếp hạng, mọi thứ được gom trong một giao diện nhẹ và dễ dùng.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {coreFeatures.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-[0_12px_35px_rgba(72,48,26,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(72,48,26,0.1)]">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-orange-500">
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-xl font-black text-slate-950">{title}</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-[2.5rem] border border-orange-100 bg-white p-6 shadow-[0_20px_70px_rgba(72,48,26,0.08)] lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-orange-100">
              <School className="h-4 w-4" />
              Không gian giáo viên
            </span>
            <h2 className="mt-5 text-4xl font-black leading-tight">Dạy học, giao bài và xem báo cáo gọn hơn.</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Giáo viên có khu vực riêng để quản lý lớp, tạo đề, theo dõi bài nộp và nhìn nhanh tình hình học tập của học sinh.
            </p>
            <Link href="/login?role=teacher&callbackUrl=/teacher" className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white transition hover:bg-orange-600">
              Vào không gian giáo viên
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {teacherFeatures.map((feature, index) => (
              <div key={feature} className="rounded-[1.75rem] border border-orange-100 bg-orange-50/60 p-5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-sm font-black text-orange-500 shadow-sm">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="mt-5 text-lg font-black text-slate-900">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-orange-500 to-orange-600 p-8 text-white shadow-[0_24px_70px_rgba(249,115,22,0.24)] lg:p-12">
          <Layers3 className="absolute -right-8 -top-8 h-48 w-48 rotate-12 text-white/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-100">Bắt đầu ngay</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">Chọn vai trò của bạn và vào Ava trong vài giây.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[440px]">
              <Link href="/login?role=student&callbackUrl=/dashboard" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-orange-600 transition hover:bg-orange-50">
                Học sinh đăng nhập
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login?role=teacher&callbackUrl=/teacher" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/12 px-6 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/20">
                Giáo viên đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
