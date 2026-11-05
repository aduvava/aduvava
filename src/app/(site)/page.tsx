import Link from "next/link";
import {
  ArrowRight, BarChart3, BookOpen, CheckCircle2, FileText,
  GraduationCap, Layers3, Medal, School, Sparkles, Target,
  Trophy, Users, Clock3, Play, ChartNoAxesCombined,
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


export default function HomePage() {
  return (
    <main className="hide-site-header overflow-hidden bg-[#fffaf0] text-slate-950">
      <section id="gioi-thieu" className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(251,146,60,0.2),transparent_35%),radial-gradient(circle_at_87%_18%,rgba(255,226,181,0.64),transparent_33%),linear-gradient(180deg,#fff8ec,#fffdf8)]" />
        <div className="relative mx-auto max-w-[1440px] px-3 pt-8 sm:px-6 lg:px-8 lg:pt-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-orange-600 shadow-sm sm:text-xs">
            <Sparkles className="h-4 w-4" />
            Học vui mỗi ngày cùng Educhi
          </span>
          <h1 className="mt-5 font-black leading-[1.18] tracking-[-0.055em] text-slate-950 [font-size:clamp(15px,4.3vw,62px)] sm:mt-6">
            <span className="block whitespace-nowrap">Luyện Đề Thông Minh,</span>
            <span className="block whitespace-nowrap text-orange-500">Tự Tin Vượt Ải Cùng Educhi</span>
          </h1>
        </div>

        <div className="relative mx-auto grid max-w-[1440px] items-center gap-8 px-4 pb-12 pt-7 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:px-8 lg:pb-16 lg:pt-10">
          <div>
            <p className="max-w-xl text-base font-medium leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Luyện đề theo lớp, môn học và kỳ thi. Chấm điểm ngay, theo dõi tiến bộ, học cùng giáo viên và tự tin chinh phục mục tiêu của bạn trên một nền tảng.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-3">
              <Link href="/login?role=student&callbackUrl=/dashboard" className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-orange-500 px-2 py-3 text-[12px] font-black text-white shadow-[0_12px_28px_rgba(249,115,22,0.22)] transition hover:-translate-y-0.5 hover:bg-orange-600 sm:gap-2 sm:px-5 sm:text-sm">
                <GraduationCap className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                Tôi là Học sinh
                <ArrowRight className="hidden h-4 w-4 sm:block" />
              </Link>
              <Link href="/login?role=teacher&callbackUrl=/teacher" className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border border-orange-200 bg-white px-2 py-3 text-[12px] font-black text-orange-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-50 sm:gap-2 sm:px-5 sm:text-sm">
                <School className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                Tôi là Giáo viên
              </Link>
            </div>

            <div className="mt-7 grid max-w-xl grid-cols-2 gap-3 sm:mt-9">
              <div className="rounded-2xl border border-orange-100 bg-white/90 px-4 py-4 shadow-[0_12px_32px_rgba(74,45,18,0.06)] sm:px-6">
                <p className="text-3xl font-black tracking-tight text-orange-500 sm:text-4xl">5.000+</p>
                <p className="mt-1 text-xs font-extrabold text-slate-600 sm:text-sm">Đề thi luyện tập</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-white/90 px-4 py-4 shadow-[0_12px_32px_rgba(74,45,18,0.06)] sm:px-6">
                <p className="text-3xl font-black tracking-tight text-orange-500 sm:text-4xl">20.000+</p>
                <p className="mt-1 text-xs font-extrabold text-slate-600 sm:text-sm">Học viên đồng hành</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[620px]">
            <div aria-hidden="true" className="absolute -inset-3 rounded-[3rem] bg-orange-300/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-3 shadow-[0_28px_75px_rgba(94,55,21,0.12)] sm:p-5">
              <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500 p-4 text-white sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider sm:text-xs">
                      <Play className="h-3 w-3 fill-current" /> Phòng luyện đề
                    </span>
                    <p className="mt-3 text-xl font-black leading-tight sm:text-2xl">Mỗi câu đúng, một bước tiến!</p>
                    <p className="mt-1 text-xs font-medium text-orange-50 sm:text-sm">Toán học · Luyện tập theo chương</p>
                  </div>
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white p-1.5 shadow-lg sm:h-24 sm:w-24 sm:rounded-3xl">
                    <MascotAvatar />
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between text-[11px] font-bold sm:text-xs">
                  <span>Tiến độ luyện tập</span><span>8 / 10 câu</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full w-4/5 rounded-full bg-white" />
                </div>
              </div>
              <div className="mt-3 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 sm:mt-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-black text-orange-600">Câu hỏi mẫu</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Làm bài linh hoạt</span>
                </div>
                <p className="mt-3 text-sm font-extrabold leading-6 text-slate-900 sm:text-base">Giải phương trình 2x + 5 = 13. Giá trị của x là?</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {["A. 2", "B. 3", "C. 4", "D. 5"].map((answer, index) => (
                    <div key={answer} className={index === 2
                      ? "flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700 sm:text-sm"
                      : "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 sm:text-sm"}>
                      {answer}{index === 2 ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-3">
                  <Trophy className="h-5 w-5 shrink-0 text-orange-500" />
                  <span className="text-xs font-extrabold text-slate-700">Luyện tập mỗi ngày</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-3">
                  <ChartNoAxesCombined className="h-5 w-5 shrink-0 text-blue-500" />
                  <span className="text-xs font-extrabold text-slate-700">Theo dõi tiến bộ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tinh-nang" className="mx-auto max-w-[1440px] px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pt-14">
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
              <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">Chọn vai trò của bạn và vào Educhi trong vài giây.</h2>
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
