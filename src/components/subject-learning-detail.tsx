"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Atom,
  BookOpen,
  Calculator,
  CalendarDays,
  Clock3,
  Cog,
  Dna,
  Earth,
  Eye,
  Factory,
  FileText,
  Flame,
  FlaskConical,
  Landmark,
  Languages,
  Laptop,
  Leaf,
  MessageCircleMore,
  Play,
  Scale,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { MascotAvatar } from "@/components/mascot-avatar";

type LearningUnit = {
  title: string;
  lessons: string[];
};

type SubjectItem = {
  slug: string;
  name: string;
  shortName: string;
  accent: string;
  icon: string;
  lessonCount: number;
  examCount: number;
};

type HotExam = {
  id: string;
  title: string;
  href: string;
  durationMinutes: number;
  questionCount: number;
  attemptCount: number;
  weeklyParticipants: number;
};

type TheoryChapterItem = {
  id: string;
  title: string;
  description?: string | null;
  lessons: Array<{
    id: string;
    title: string;
    summary?: string | null;
    href: string;
  }>;
};

type SubjectLearningDetailProps = {
  subject: SubjectItem & {
    description: string;
    units: LearningUnit[];
    theoryChapters: TheoryChapterItem[];
  };
  subjects: SubjectItem[];
  hotExams: HotExam[];
  levelLabel?: string;
  gradeLabel?: string;
  contextQuery: string;
};

const iconMap = {
  calculator: Calculator,
  "book-open": BookOpen,
  languages: Languages,
  landmark: Landmark,
  earth: Earth,
  dna: Dna,
  atom: Atom,
  flask: FlaskConical,
  scale: Scale,
  cog: Cog,
  leaf: Leaf,
  factory: Factory,
  laptop: Laptop,
} as const;

type LearningMode = "topics" | "exams" | "theory";

const learningModes: Array<{ id: LearningMode; label: string; icon: typeof BookOpen }> = [
  { id: "topics", label: "Theo Chuyên đề", icon: BookOpen },
  { id: "exams", label: "Theo Kì thi", icon: CalendarDays },
  { id: "theory", label: "Lý thuyết", icon: FileText },
];

function SubjectIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = iconMap[icon as keyof typeof iconMap] ?? BookOpen;
  return <Icon className={className} strokeWidth={1.9} />;
}

export function SubjectLearningDetail({
  subject,
  subjects,
  hotExams,
  levelLabel,
  gradeLabel,
  contextQuery,
}: SubjectLearningDetailProps) {
  const [mode, setMode] = useState<LearningMode>("topics");
  const [supportOpen, setSupportOpen] = useState(false);
  const totalLessons = subject.units.reduce((sum, unit) => sum + unit.lessons.length, 0);

  return (
    <div className="subject-learning-page min-h-screen bg-[#fffdf1] pb-28 text-slate-900">
      <div className="mx-auto max-w-[1660px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard"
            aria-label="Quay lại trang chủ"
            className="grid h-11 w-11 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-orange-500"
          >
            <ArrowLeft className="h-7 w-7" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Chi tiết môn học</h1>
            {levelLabel || gradeLabel ? (
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {[levelLabel, gradeLabel].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-7 flex gap-4 overflow-x-auto pb-4 [scrollbar-color:#9ca3af_transparent]">
          {subjects.map((item) => {
            const active = item.slug === subject.slug;
            return (
              <Link
                key={item.slug}
                href={`/subjects/${item.slug}${contextQuery}`}
                className={clsx(
                  "flex min-w-[250px] items-center gap-4 rounded-[2rem] border px-5 py-5 transition-all duration-200 sm:min-w-[280px]",
                  active
                    ? "border-orange-400 bg-orange-500 text-white shadow-lg shadow-orange-200"
                    : "border-white bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-orange-100 hover:shadow-md",
                )}
              >
                <span className={clsx(
                  "grid h-16 w-16 shrink-0 place-items-center rounded-2xl",
                  active ? "bg-white/95 text-orange-500" : `bg-gradient-to-br ${item.accent} text-white`,
                )}>
                  <SubjectIcon icon={item.icon} className="h-8 w-8" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-lg font-black">{item.shortName}</span>
                  <span className={clsx("mt-1 block text-xs font-bold", active ? "text-orange-100" : "text-slate-400")}>
                    {item.lessonCount} bài giảng · {item.examCount} đề thi
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <section className="mt-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-3 text-2xl font-black">
              <Flame className="h-7 w-7 fill-orange-500 text-orange-500" /> Đề thi hot
            </h2>
            <Link href="/thi-thptqg" className="text-sm font-black text-orange-500 hover:text-orange-600">
              Xem tất cả
            </Link>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {hotExams.slice(0, 3).map((exam) => (
              <article key={exam.id} className="relative overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
                <span className="absolute right-0 top-0 rounded-bl-3xl bg-orange-500 px-5 py-2.5 text-xs font-black text-white">
                  {exam.weeklyParticipants} người thi tuần này
                </span>
                <div className="pt-7">
                  <h3 className="min-h-14 text-lg font-black leading-7 text-slate-800">{exam.title}</h3>
                  <div className="mt-5 flex flex-wrap gap-4 text-xs font-extrabold uppercase text-slate-400">
                    <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4" />{exam.attemptCount.toLocaleString("vi-VN")} lượt thi</span>
                    <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4" />{exam.questionCount} câu</span>
                    <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{exam.durationMinutes} phút</span>
                  </div>
                  <Link
                    href={exam.href}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-50 px-4 py-3.5 text-sm font-black text-orange-600 transition hover:bg-orange-500 hover:text-white"
                  >
                    <Play className="h-4 w-4 fill-current" /> Làm bài ngay
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!hotExams.length ? (
            <div className="mt-5 rounded-[2rem] border-2 border-dashed border-orange-200 bg-white/70 px-6 py-12 text-center text-sm font-semibold text-slate-500">
              Chưa có đề thi được xuất bản cho môn học này.
            </div>
          ) : null}
        </section>

        <section className="mt-8">
          {mode === "topics" ? (
            <>
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Học theo chuyên đề</p>
                  <h2 className="mt-1 text-2xl font-black uppercase sm:text-3xl">Chuyên đề môn {subject.name}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{subject.description}</p>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
                  <SlidersHorizontal className="h-4 w-4" /> {subject.units.length} chương · {totalLessons} chuyên đề
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {subject.units.map((unit, unitIndex) => (
                  <section key={unit.title}>
                    <h3 className="text-xl font-black text-orange-600 sm:text-2xl">
                      Chương {unitIndex + 1}: {unit.title}
                      <span className="ml-3 text-sm font-bold text-slate-400">({unit.lessons.length * 12} đề luyện)</span>
                    </h3>
                    <div className="mt-4 space-y-4">
                      {unit.lessons.map((lesson, lessonIndex) => {
                        const exam = hotExams.length ? hotExams[(unitIndex + lessonIndex) % hotExams.length] : null;
                        return (
                          <article key={lesson} className="rounded-[1.6rem] border border-slate-200/80 bg-white px-5 py-5 shadow-sm sm:px-7">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 gap-4">
                                <span className="text-lg font-black text-slate-400">{lessonIndex + 1}.</span>
                                <div>
                                  <h4 className="font-bold leading-7 text-slate-700">{lesson}</h4>
                                  {exam ? (
                                    <div className="mt-2 flex flex-wrap gap-4 text-xs font-extrabold uppercase text-slate-400">
                                      <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> {exam.questionCount} câu</span>
                                      <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> {exam.durationMinutes} phút</span>
                                      <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4" /> {exam.attemptCount.toLocaleString("vi-VN")} lượt thi</span>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              {exam ? (
                                <Link href={exam.href} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-orange-50 px-5 py-3 text-sm font-black text-orange-600 transition hover:bg-orange-500 hover:text-white">
                                  <FileText className="h-4 w-4" /> Làm bài ngay
                                </Link>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
              {!subject.units.length ? (
                <div className="mt-6 rounded-[2rem] border-2 border-dashed border-orange-200 bg-white/70 px-6 py-12 text-center text-sm font-semibold text-slate-500">
                  Chưa có chuyên đề trong database.
                </div>
              ) : null}
            </>
          ) : null}

          {mode === "exams" ? (
            <>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Luyện theo mốc kiểm tra</p>
                <h2 className="mt-1 text-2xl font-black uppercase sm:text-3xl">Đề kiểm tra môn {subject.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Chọn đúng loại kì thi để luyện cấu trúc và thời gian làm bài tương ứng.</p>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {hotExams.map((exam) => (
                  <article key={exam.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
                    <h3 className="font-black leading-6 text-slate-800">{exam.title}</h3>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold uppercase text-slate-400">
                      <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4" />{exam.questionCount} câu</span>
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{exam.durationMinutes} phút</span>
                      <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4" />{exam.attemptCount} lượt thi</span>
                    </div>
                    <Link href={exam.href} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-600">
                      <Play className="h-4 w-4 fill-current" /> Làm đề
                    </Link>
                  </article>
                ))}
              </div>
              {!hotExams.length ? <p className="mt-6 rounded-2xl border border-dashed border-orange-200 bg-white px-5 py-10 text-center text-sm font-semibold text-slate-500">Chưa có đề thi được xuất bản.</p> : null}
            </>
          ) : null}

          {mode === "theory" ? (
            <>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Hệ thống kiến thức</p>
                <h2 className="mt-1 text-2xl font-black uppercase sm:text-3xl">Lý thuyết môn {subject.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Nội dung trọng tâm được sắp xếp theo chương để dễ ôn tập.</p>
              </div>
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {subject.theoryChapters.map((chapter, unitIndex) => (
                  <article key={chapter.id} className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <BookOpen className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-emerald-600">Chương {unitIndex + 1}</p>
                        <h3 className="mt-1 text-xl font-black text-slate-800">{chapter.title}</h3>
                        {chapter.description ? <p className="mt-2 text-sm leading-6 text-slate-500">{chapter.description}</p> : null}
                      </div>
                    </div>
                    <ul className="mt-5 space-y-3">
                      {chapter.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <Link href={lesson.href} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-orange-50 hover:text-orange-600">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                            <span>
                              <span className="block">{lesson.title}</span>
                              {lesson.summary ? <span className="mt-1 block text-xs font-medium text-slate-400">{lesson.summary}</span> : null}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
              {!subject.theoryChapters.length ? <p className="mt-6 rounded-2xl border border-dashed border-emerald-200 bg-white px-5 py-10 text-center text-sm font-semibold text-slate-500">Chưa có bài lý thuyết được xuất bản.</p> : null}
            </>
          ) : null}
        </section>
      </div>

      <div className="sticky bottom-4 z-30 mx-auto flex w-[calc(100%-2rem)] max-w-2xl items-center justify-center rounded-full border border-orange-100 bg-white/95 p-2 shadow-[0_16px_50px_rgba(78,48,20,0.16)] backdrop-blur">
        {learningModes.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-3 text-xs font-black transition sm:text-sm",
                mode === item.id ? "bg-orange-500 text-white shadow-md shadow-orange-200" : "text-slate-500 hover:bg-orange-50 hover:text-orange-600",
              )}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </button>
          );
        })}
      </div>

      {supportOpen ? (
        <div className="fixed bottom-24 right-5 z-50 w-[calc(100%-2.5rem)] max-w-sm rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black">Trợ giảng {subject.shortName}</p>
              <p className="mt-1 text-xs text-slate-400">Hỏi nhanh về bài học và đề luyện</p>
            </div>
            <button type="button" onClick={() => setSupportOpen(false)} className="rounded-full p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-slate-600">
            Bạn đang cần giải thích phần nào trong môn {subject.name}?
          </div>
          <div className="mt-3 flex gap-2">
            <input className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400" placeholder="Nhập câu hỏi..." />
            <button type="button" className="rounded-2xl bg-orange-500 px-4 text-sm font-black text-white">Gửi</button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setSupportOpen((open) => !open)}
        aria-label="Mở trợ giảng"
        className="fixed bottom-6 right-5 z-50 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-4 border-orange-500 bg-white text-white shadow-[0_12px_35px_rgba(249,115,22,0.4)] transition hover:-translate-y-1"
      >
        <MascotAvatar />
      </button>
    </div>
  );
}
