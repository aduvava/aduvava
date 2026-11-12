"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Atom,
  BellRing,
  BookMarked,
  BookOpenText,
  Calculator,
  Check,
  ChevronRight,
  Clock3,
  Cog,
  Dna,
  Earth,
  Flame,
  Gavel,
  GraduationCap,
  Headphones,
  Image as ImageIcon,
  Languages,
  Landmark,
  Laptop,
  Leaf,
  MessageCircleMore,
  Play,
  Send,
  Sparkles,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { getDashboardImage } from "@/data/dashboard-images";
import { getStoreImageUrl } from "@/lib/store-image-url";
import { MascotAvatar } from "@/components/mascot-avatar";
import { getDashboardSubjects, getSubjectCatalogSize } from "@/lib/dashboard-subjects";
import { specialExamTracks } from "@/lib/special-exam-tracks";

type ExamItem = {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  type: string;
};

type DashboardRankingItem = {
  rank: number;
  name: string;
  score: number;
};

type DashboardSubject = {
  slug: string;
  name: string;
};

type DashboardProps = {
  firstName: string;
  greeting: string;
  dashboardImageKey: string | null;
  dashboardImageName: string | null;
  dashboardUploadedImage?: string | null;
  learningStreak: number;
  weekActivity: boolean[];
  continueLearning: { title: string; href: string };
  subjects: DashboardSubject[];
  exams: ExamItem[];
  rankingScope: string;
  rankings: DashboardRankingItem[];
};

const studyGroups = [
  {
    id: "secondary",
    label: "Trung học cơ sở",
    classes: ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"],
  },
  {
    id: "high-school",
    label: "Trung học phổ thông",
    classes: ["Lớp 10", "Lớp 11", "Lớp 12"],
  },
  {
    id: "grade-10",
    label: "Ôn thi vào 10",
    classes: ["Môn thi"],
  },
  {
    id: "national-exam",
    label: "Ôn thi THPTQG",
    classes: ["Môn thi", "Kỳ thi riêng"],
  },
];

type CommunityMessage = {
  id: number;
  name: string;
  initials: string;
  text: string;
  time: string;
  color: string;
  replyTo?: Pick<CommunityMessage, "name" | "text">;
};

const initialMessages: CommunityMessage[] = [];

const rankingColors = [
  "bg-amber-100 text-amber-700",
  "bg-blue-100 text-blue-700",
  "bg-pink-100 text-pink-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

type SubjectVisual = {
  icon: typeof Calculator;
  imageSrc?: string;
  className: string;
};

const subjectVisuals = {
  "Toán": {
    icon: Calculator,
    imageSrc: "/subject-images/toan.png",
    className: "from-orange-50 to-amber-50 text-orange-600",
  },
  "Ngữ Văn": {
    icon: BookOpenText,
    imageSrc: "/subject-images/ngu-van.png",
    className: "from-rose-50 to-orange-50 text-rose-600",
  },
  "Tiếng Anh": {
    icon: Languages,
    imageSrc: "/subject-images/tieng-anh.png",
    className: "from-sky-50 to-blue-50 text-blue-600",
  },
  "Lịch Sử": {
    icon: Landmark,
    imageSrc: "/subject-images/lich-su.png",
    className: "from-amber-50 to-yellow-50 text-amber-700",
  },
  "Địa Lý": {
    icon: Earth,
    imageSrc: "/subject-images/dia-ly.png",
    className: "from-emerald-50 to-cyan-50 text-emerald-600",
  },
  "Sinh Học": {
    icon: Dna,
    imageSrc: "/subject-images/sinh-hoc.png",
    className: "from-green-50 to-lime-50 text-green-600",
  },
  "Vật Lý": {
    icon: Atom,
    imageSrc: "/subject-images/vat-ly.png",
    className: "from-sky-50 to-blue-50 text-sky-600",
  },
  "Hóa Học": {
    icon: BookMarked,
    imageSrc: "/subject-images/hoa-hoc.png",
    className: "from-emerald-50 to-lime-50 text-emerald-600",
  },
  "KHTN (Sinh Học)": {
    icon: Dna,
    imageSrc: "/subject-images/sinh-hoc.png",
    className: "from-green-50 to-lime-50 text-green-600",
  },
  "KHTN (Vật Lý)": {
    icon: Atom,
    imageSrc: "/subject-images/vat-ly.png",
    className: "from-sky-50 to-blue-50 text-sky-600",
  },
  "KHTN (Hóa Học)": {
    icon: BookMarked,
    imageSrc: "/subject-images/hoa-hoc.png",
    className: "from-emerald-50 to-lime-50 text-emerald-600",
  },
  "Giáo dục công dân": {
    icon: Gavel,
    imageSrc: "/subject-images/kt-va-phap-luat.png",
    className: "from-amber-50 to-orange-50 text-amber-700",
  },
  "Tin học": {
    icon: Laptop,
    className: "from-blue-50 to-cyan-50 text-blue-600",
  },
  "KT&PL": {
    icon: Gavel,
    imageSrc: "/subject-images/kt-va-phap-luat.png",
    className: "from-amber-50 to-orange-50 text-amber-700",
  },
  "Công Nghệ": {
    icon: Cog,
    imageSrc: "/subject-images/cong-nghe-nong-nghiep.png",
    className: "from-lime-50 to-emerald-50 text-emerald-600",
  },
  "Công nghệ Nông nghiệp": {
    icon: Leaf,
    imageSrc: "/subject-images/cong-nghe-nong-nghiep.png",
    className: "from-lime-50 to-green-50 text-lime-700",
  },
  "Công nghệ Công nghiệp": { icon: Cog, className: "from-orange-100 to-amber-50 text-orange-600" },
} satisfies Record<string, SubjectVisual>;

function getItemVisual(item: string, slug: string): SubjectVisual {
  if (item in subjectVisuals) return subjectVisuals[item as keyof typeof subjectVisuals];

  // Subject names in the database may use different case, accents or spelling.
  // Reuse the existing illustrations rather than dropping back to plain icons.
  const normalized = (item + " " + slug)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d");

  const aliases: [RegExp, keyof typeof subjectVisuals][] = [
    [/toan/, "Toán"],
    [/ngu[ -]?van|van[ -]?hoc/, "Ngữ Văn"],
    [/tieng[ -]?anh|english/, "Tiếng Anh"],
    [/lich[ -]?su/, "Lịch Sử"],
    [/dia[ -]?ly/, "Địa Lý"],
    [/vat[ -]?ly|vat[ -]?li/, "Vật Lý"],
    [/hoa[ -]?hoc/, "Hóa Học"],
    [/sinh[ -]?hoc|sinh[ -]?vat/, "Sinh Học"],
    [/khoa[ -]?hoc[ -]?tu[ -]?nhien|khtn/, "KHTN (Sinh Học)"],
    [/kinh[ -]?te|phap[ -]?luat|giao[ -]?duc[ -]?cong[ -]?dan|gdcd/, "KT&PL"],
    [/cong[ -]?nghe/, "Công Nghệ"],
  ];
  const match = aliases.find(([pattern]) => pattern.test(normalized));
  if (match) return subjectVisuals[match[1]];

  return { icon: GraduationCap, imageSrc: undefined, className: "from-orange-100 to-amber-50 text-orange-600" };
}

// Match the EXP shop's homepage-picture previews when a shop item has no uploaded image.
const shopAvatarVisuals = {
  detective: { gradient: "from-amber-100 via-orange-200 to-slate-800", icon: ImageIcon, color: "text-slate-900" },
  ukulele: { gradient: "from-pink-100 via-rose-200 to-orange-400", icon: ImageIcon, color: "text-rose-700" },
  "animated-star": { gradient: "from-slate-950 via-violet-700 to-yellow-300", icon: Sparkles, color: "text-white" },
} as const;

function DashboardImageCard({ imageKey, imageName, uploadedImage }: { imageKey: string | null; imageName: string | null; uploadedImage: string | null }) {
  const image = getDashboardImage(imageKey);
  const imageSource = getStoreImageUrl(uploadedImage);
  const shopVisual = imageKey && imageKey in shopAvatarVisuals
    ? shopAvatarVisuals[imageKey as keyof typeof shopAvatarVisuals]
    : null;
  const ShopIcon = shopVisual?.icon;

  return (
    <section className="h-[230px] min-w-0 w-full overflow-hidden rounded-[1.5rem] border border-orange-100/80 bg-white p-3 shadow-[0_10px_22px_rgba(81,52,24,0.05)] sm:h-[210px] md:h-[190px] md:p-4">
      <Link
        href="/kho-do"
        aria-label={imageKey ? `Đổi ảnh lớn trang chủ: ${imageName ?? "Ảnh đang dùng"}` : "Mở kho đồ và chọn ảnh trang chủ"}
        title={imageKey ? "Đổi ảnh lớn trong kho đồ" : "Chọn ảnh trang chủ trong kho đồ"}
        className="relative flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-[1.1rem] bg-orange-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
      >
        {imageSource ? (
          <img
            src={imageSource}
            alt={imageName ?? "Ảnh trang chủ đã trang bị"}
            className="absolute inset-0 block h-full w-full object-contain object-center p-2"
          />
        ) : image ? (
          <img
            src={image.src}
            alt={image.alt}
            className="absolute inset-0 block h-full w-full object-contain object-center p-2"
          />
        ) : shopVisual && ShopIcon ? (
          <div className={clsx("grid h-full w-full place-items-center bg-gradient-to-br", shopVisual.gradient)}>
            <ShopIcon className={clsx("h-16 w-16 drop-shadow-xl", shopVisual.color)} strokeWidth={1.4} />
          </div>
        ) : (
          <div className="h-full w-full max-w-[164px]">
            <MascotAvatar />
          </div>
        )}
      </Link>
    </section>
  );
}

function StreakCard({ learningStreak, weekActivity }: { learningStreak: number; weekActivity: boolean[] }) {
  const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  return (
    <section className="relative h-[210px] min-w-0 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-orange-500 to-[#ff6508] p-4 text-white shadow-[0_10px_22px_rgba(249,115,22,0.14)] sm:h-[190px]">
      <div aria-hidden="true" className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
      <div aria-hidden="true" className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-amber-300/15" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 fill-orange-100 text-orange-100" />
          <p className="text-xs font-extrabold tracking-[0.14em] text-orange-50">CHUỖI NGÀY HỌC</p>
        </div>
        <p className="mt-1.5 flex items-end gap-1.5 text-2xl font-black tracking-tight">
          {learningStreak} <span className="mb-0.5 text-lg">ngày</span>
        </p>
        <div className="mt-3 grid min-w-0 grid-cols-7 gap-1">
          {days.map((day, index) => {
            const complete = weekActivity[index] === true;
            const today = index === (new Date().getDay() || 7) - 1;
            return (
              <div key={day} className="min-w-0 text-center">
                <div className={clsx(
                  "mx-auto grid h-8 w-8 place-items-center rounded-full border text-[11px] font-black transition min-[375px]:h-10 min-[375px]:w-10 sm:h-9 sm:w-9",
                  complete && "border-white bg-white text-orange-600 shadow-sm",
                  today && !complete && "border-white bg-white/20 text-white",
                  !today && !complete && "border-white/40 bg-white/10 text-white",
                )}>
                  {complete ? <Check className="h-5 w-5" /> : day}
                </div>
                <span className="mt-1 block text-[10px] font-bold text-orange-50">{day}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-auto pt-2 text-center text-xs font-semibold text-orange-50">
          Tính từ các bài thi đã nộp
        </p>
      </div>
    </section>
  );
}

function ChatSupport() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open ? (
        <div className="fixed bottom-[calc(11rem+env(safe-area-inset-bottom))] right-4 z-50 lg:bottom-24 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_24px_70px_rgba(72,44,20,0.2)] sm:right-6">
          <div className="flex items-center justify-between bg-orange-500 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 overflow-hidden rounded-full border-2 border-white/70 bg-white">
                <MascotAvatar variant="chat" />
              </span>
              <div>
                <p className="font-extrabold">Hỗ trợ Educhi</p>
                <p className="text-xs text-orange-100">Thường phản hồi trong vài phút</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng chat" className="rounded-full p-2 hover:bg-white/15"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-3 bg-orange-50/50 p-5">
            <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white p-3 text-sm leading-6 text-slate-600 shadow-sm">
              Chào bạn! Educhi có thể hỗ trợ gì cho việc học hôm nay?
            </div>
            <div className="flex gap-2">
              <input placeholder="Nhập câu hỏi..." className="min-w-0 flex-1 rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400" />
              <button type="button" aria-label="Gửi tin nhắn" className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500 text-white"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mở chat hỗ trợ"
        className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] right-4 z-50 grid h-16 w-16 place-items-center overflow-visible bg-transparent text-white transition hover:-translate-y-1 sm:right-6 lg:bottom-6"
      >
        {open ? <span className="grid h-full w-full place-items-center bg-orange-500"><X className="h-6 w-6" /></span> : <MascotAvatar variant="chat" />}
      </button>
    </>
  );
}

function ExamCenter({ exams }: { exams: ExamItem[] }) {
  return (
    <section className="rounded-[1.5rem] border border-orange-100 bg-white p-4 shadow-[0_10px_26px_rgba(81,52,24,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-black text-slate-900">Đề thi gợi ý cho bạn</h2>
      </div>
      <div className="mt-4 space-y-3">
        {exams.slice(0, 3).map((exam, index) => (
          <div key={exam.id} className="rounded-xl border border-orange-100 bg-orange-50/30 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-orange-600">
                  {exam.type === "MOCK" ? "TRẮC NGHIỆM" : "KIỂM TRA"}
                </span>
                <h3 className="mt-2 line-clamp-2 text-xs font-extrabold leading-5 text-slate-800">{exam.title}</h3>
              </div>
              <span className="flex shrink-0 items-center gap-0.5 text-amber-400" aria-label={`${5 - (index % 3)} trên 5 sao`}>
                {[0, 1, 2, 3, 4].map((star) => (
                  <Star key={star} className={clsx("h-3.5 w-3.5", star < 5 - (index % 3) && "fill-current")} />
                ))}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Clock3 className="h-4 w-4" /> {exam.durationMinutes} phút
              </span>
              <Link href={`/exams/${exam.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-orange-300 bg-white px-3 py-2 text-xs font-extrabold text-orange-600 shadow-sm transition hover:bg-orange-500 hover:text-white">
                <Play className="h-3 w-3 fill-current" /> Bắt đầu
              </Link>
            </div>
          </div>
        ))}
        {!exams.length ? <p className="py-6 text-sm text-slate-500">Chưa có đề phù hợp để gợi ý.</p> : null}
      </div>
    </section>
  );
}

export function StudentDashboard({
  firstName,
  greeting,
  dashboardImageKey,
  dashboardImageName,
  dashboardUploadedImage,
  learningStreak,
  weekActivity,
  continueLearning,
  subjects,
  exams,
  rankingScope = "THPTQG · Tất cả môn",
  rankings = [],
}: DashboardProps) {
  const [activeGroup, setActiveGroup] = useState(studyGroups[0].id);
  const currentGroup = useMemo(() => studyGroups.find((group) => group.id === activeGroup) ?? studyGroups[0], [activeGroup]);
  const [activeClass, setActiveClass] = useState(studyGroups[0].classes[0]);
  const visibleSubjects = useMemo(() => getDashboardSubjects(subjects, activeGroup), [subjects, activeGroup]);
  const showingSpecialExams = activeGroup === "national-exam" && activeClass === "Kỳ thi riêng";
  const [activeSubject, setActiveSubject] = useState(getDashboardSubjects(subjects, studyGroups[0].id)[0]?.slug ?? "");
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>(initialMessages);
  const [communityDraft, setCommunityDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<CommunityMessage | null>(null);

  function selectGroup(group: (typeof studyGroups)[number]) {
    setActiveGroup(group.id);
    setActiveClass(group.classes[0]);
    setActiveSubject(getDashboardSubjects(subjects, group.id)[0]?.slug ?? "");
  }

  function selectClass(className: string) {
    setActiveClass(className);
    setActiveSubject(visibleSubjects[0]?.slug ?? "");
  }

  function sendCommunityMessage() {
    const text = communityDraft.trim();
    if (!text) return;

    const now = new Date();
    setCommunityMessages((items) => [
      ...items,
      {
        id: Date.now(),
        name: firstName || "Bạn",
        initials: getInitials(firstName || "Bạn"),
        text,
        time: now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        color: "bg-orange-100 text-orange-600",
        replyTo: replyTarget ? { name: replyTarget.name, text: replyTarget.text } : undefined,
      },
    ]);
    setCommunityDraft("");
    setReplyTarget(null);
  }

  return (
    <div className="student-dashboard min-h-screen bg-orange-50/40 pb-20">
      <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 md:grid-cols-3">
          <DashboardImageCard imageKey={dashboardImageKey} imageName={dashboardImageName} uploadedImage={dashboardUploadedImage ?? null} />
          <section className="relative hidden h-[210px] min-w-0 overflow-hidden rounded-[1.5rem] border border-orange-100/80 bg-white p-4 shadow-[0_10px_22px_rgba(81,52,24,0.05)] sm:h-[190px] md:flex">
            <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-orange-100/60 blur-2xl" />
            <div className="relative flex min-w-0 flex-1 flex-col justify-center">
              <h1 className="text-lg font-black leading-tight tracking-tight text-slate-950 sm:text-xl">
                {greeting}<br /><span className="text-orange-500">{firstName}!</span>
              </h1>
              <p className="mt-3 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm">Dữ liệu tiến độ được cập nhật từ bài làm của bạn.</p>
              <Link href={continueLearning.href} className="mt-3 inline-flex w-fit items-center gap-2 rounded-xl bg-orange-500 px-3.5 py-2 text-[11px] font-extrabold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-600">
                Học tiếp bài {continueLearning.title}<ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
          <StreakCard learningStreak={learningStreak} weekActivity={weekActivity} />
        </div>

        <section id="mon-hoc" className="-mx-4 mt-6 scroll-mt-20 bg-[#fffdf0] px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className={clsx("mx-auto grid max-w-[1180px] items-start gap-5", !showingSpecialExams && "lg:grid-cols-[minmax(0,760px)_minmax(320px,360px)]")}>
            <div>
          <div className="grid grid-cols-2 gap-2 pb-2 sm:flex sm:justify-center sm:gap-3 sm:overflow-x-auto">
            {studyGroups.map((group) => {
              const active = group.id === activeGroup;
              return (
                <button key={group.id} type="button" onClick={() => selectGroup(group)} className={clsx(
                  "flex min-h-[40px] shrink-0 items-center justify-center rounded-full border px-3 py-1.5 text-center text-xs font-extrabold transition-all duration-200 sm:min-h-[44px] sm:px-5 sm:py-2 lg:px-6",
                  active
                    ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-200"
                    : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:text-orange-600",
                )}>
                  {group.label}
                </button>
              );
            })}
          </div>
          <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
            {currentGroup.classes.map((className) => (
              <button
                key={className}
                type="button"
                onClick={() => selectClass(className)}
                className={clsx(
                  "min-w-[70px] rounded-full border px-3 py-1.5 text-xs font-extrabold transition-all duration-200 sm:min-w-[74px] sm:px-4 sm:py-2",
                  activeClass === className
                    ? "border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-200"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600",
                )}
              >
                {className}
              </button>
            ))}
          </div>
          {showingSpecialExams ? (
            <div className="mx-auto mt-5 max-w-[690px]">
              <nav aria-label="Các kỳ thi riêng" className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {specialExamTracks.map((track) => (
                  <Link
                    key={track.id}
                    data-testid="special-exam-track"
                    href={`/exams/special/${track.slug}`}
                    className="group flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-[1.25rem] border border-orange-100 bg-white px-2 py-2 text-center shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 sm:min-h-[124px] sm:gap-3 sm:px-3 sm:py-4"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                      <GraduationCap className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-black text-slate-900 group-hover:text-blue-600">{track.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          ) : (
          <div className="mx-auto mt-5 grid max-w-[690px] grid-cols-2 justify-items-center gap-2 sm:grid-cols-3 sm:gap-3">
            {visibleSubjects.map((subject) => {
              const visual = getItemVisual(subject.name, subject.slug);
              const ItemIcon = visual.icon;
              const active = activeSubject === subject.slug;

              return (
                <Link
                  key={subject.slug}
                  href={`/subjects/${subject.slug}?level=${encodeURIComponent(activeGroup)}&grade=${encodeURIComponent(activeClass)}`}
                  onClick={() => setActiveSubject(subject.slug)}
                  className={clsx(
                    "group flex min-h-[112px] w-full max-w-[165px] flex-col items-center justify-center rounded-xl border bg-white px-2 py-2.5 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:min-h-[124px] sm:rounded-[1.35rem] sm:px-3 sm:py-3.5",
                    active
                      ? "border-blue-400 ring-4 ring-blue-100"
                      : "border-white hover:border-orange-100",
                  )}
                >
                  <span
                    className={clsx(
                      "grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-xl bg-gradient-to-br transition-transform duration-200 group-hover:scale-105 sm:h-[58px] sm:w-[58px] sm:rounded-[1rem]",
                      visual.className,
                    )}
                  >
                    {visual.imageSrc ? (
                      <img src={visual.imageSrc} alt={`Ảnh môn ${subject.name}`} className="h-full w-full object-cover" />
                    ) : (
                      <ItemIcon className="h-6 w-6" strokeWidth={1.8} />
                    )}
                  </span>
                  <span className={clsx("mt-3 text-xs font-extrabold", active ? "text-blue-600" : "text-slate-900")}>
                    {subject.name}
                  </span>
                </Link>
              );
            })}
          </div>
          )}
          {!showingSpecialExams && !visibleSubjects.length ? (
            <p className="mx-auto mt-5 max-w-xl rounded-2xl border border-dashed border-orange-200 bg-white px-5 py-8 text-center text-sm font-semibold text-slate-500">
              Chưa có môn học phù hợp trong cơ sở dữ liệu. Quản trị viên có thể bổ sung môn học để hiển thị tại đây.
            </p>
          ) : null}
          {!showingSpecialExams && visibleSubjects.length > 0 && visibleSubjects.length < getSubjectCatalogSize(activeGroup) ? (
            <p className="mt-4 text-center text-xs text-slate-500">
              Một số môn của cấp học này chưa có trong cơ sở dữ liệu nên chưa thể mở nội dung.
            </p>
          ) : null}
            </div>
            {!showingSpecialExams ? <ExamCenter exams={exams} /> : null}
          </div>
        </section>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <section className="rounded-[2.25rem] border border-orange-100/80 bg-white p-4 shadow-[0_10px_28px_rgba(81,52,24,0.055)] sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-500">Cộng đồng</p>
                <h2 className="mt-1 text-xl font-black text-slate-800">Giao lưu học tập</h2>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-[1.15rem] bg-orange-50 text-orange-500"><MessageCircleMore className="h-5 w-5" /></span>
            </div>
            <div className="mt-5 space-y-3">
              {communityMessages.map((message, index) => (
                <div key={message.id} className={clsx("flex gap-3", index === 1 && "sm:pl-10")}>
                  <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-extrabold", message.color)}>{message.initials}</span>
                  <div className="min-w-0 flex-1 rounded-[1.35rem] rounded-tl-md bg-slate-50 px-4 py-3">
                    {message.replyTo ? (
                      <div className="mb-2 rounded-xl border-l-4 border-orange-300 bg-white px-3 py-2 text-xs text-slate-500">
                        <span className="font-extrabold text-orange-600">{message.replyTo.name}</span>
                        <p className="mt-0.5 line-clamp-1">{message.replyTo.text}</p>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-extrabold text-slate-700">{message.name}</p>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setReplyTarget(message)} className="text-[11px] font-bold text-orange-500 hover:text-orange-600">Trích dẫn</button>
                        <span className="text-[11px] text-slate-400">{message.time}</span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{message.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {replyTarget ? (
              <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-xs text-slate-600">
                <div>
                  <p className="font-extrabold text-orange-600">Đang trả lời {replyTarget.name}</p>
                  <p className="mt-1 line-clamp-1">{replyTarget.text}</p>
                </div>
                <button type="button" onClick={() => setReplyTarget(null)} className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-orange-500" aria-label="Bỏ trích dẫn"><X className="h-4 w-4" /></button>
              </div>
            ) : null}
            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <input
                value={communityDraft}
                onChange={(event) => setCommunityDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendCommunityMessage();
                }}
                placeholder="Chia sẻ điều bạn đang thắc mắc..."
                className="min-w-0 flex-1 rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:bg-white"
              />
              <button type="button" onClick={sendCommunityMessage} aria-label="Gửi tin nhắn" className="grid h-11 w-11 place-items-center rounded-[1.25rem] bg-orange-500 text-white transition hover:bg-orange-600"><Send className="h-4 w-4" /></button>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-orange-100/80 bg-white p-5 shadow-[0_12px_35px_rgba(81,52,24,0.06)] sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-500">{rankingScope}</p>
                  <h2 className="mt-1 text-xl font-black text-slate-800">Bảng xếp hạng</h2>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-500"><Trophy className="h-5 w-5 fill-amber-400" /></span>
              </div>
              <div className="mt-5 space-y-3">
                {rankings.map((rankedUser, index) => (
                  <div key={rankedUser.rank} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-orange-50/60">
                    <span className={clsx(
                      "w-7 text-center text-sm font-black",
                      rankedUser.rank === 1 ? "text-amber-500" : rankedUser.rank === 2 ? "text-slate-400" : rankedUser.rank === 3 ? "text-orange-400" : "text-slate-400",
                    )}>#{rankedUser.rank}</span>
                    <span className={clsx("grid h-10 w-10 place-items-center rounded-full text-xs font-extrabold", rankingColors[index % rankingColors.length])}>
                      {getInitials(rankedUser.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-slate-700">{rankedUser.name}</p>
                      <p className="text-xs text-slate-400">{rankedUser.score} điểm</p>
                    </div>
                    {rankedUser.rank === 1 ? <BellRing className="h-4 w-4 text-amber-400" /> : null}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
      <ChatSupport />
    </div>
  );
}
