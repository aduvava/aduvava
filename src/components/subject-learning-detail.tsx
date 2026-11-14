"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, BookOpen, CalendarDays, Clock3, Eye, FileText,
  Flame, Play, SlidersHorizontal, X,
} from "lucide-react";
import { clsx } from "clsx";
import { MascotAvatar } from "@/components/mascot-avatar";
import { getItemVisual } from "@/lib/subject-visuals";

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
  contentMode: "TOPIC" | "EXAM";
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

type LearningMode = "topics" | "exams" | "theory";

const learningModes: Array<{ id: LearningMode; label: string; icon: typeof BookOpen }> = [
  { id: "topics", label: "Theo Chuyên đề", icon: BookOpen },
  { id: "exams", label: "Theo Kì thi", icon: CalendarDays },
  { id: "theory", label: "Lý thuyết", icon: FileText },
];

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
  const topicExams = hotExams.filter((exam) => exam.contentMode === "TOPIC");
  const periodExams = hotExams.filter((exam) => exam.contentMode === "EXAM");

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

        <div className="mt-6 flex gap-3 overflow-x-auto pb-3 [scrollbar-color:#9ca3af_transparent]">
          {subjects.map((item) => {
            const active = item.slug === subject.slug;
            const visual = getItemVisual(item.name, item.slug);
            const ItemIcon = visual.icon;
            return (
              <Link
                key={item.slug}
                href={`/subjects/${item.slug}${contextQuery}`}
                className={clsx(
                  "flex min-w-[235px] items-center gap-3 rounded-[1.65rem] border px-4 py-3 transition-all duration-200 sm:min-w-[265px] sm:px-5 sm:py-4",
                  active
                    ? "border-orange-400 bg-orange-500 text-white shadow-lg shadow-orange-200"
                    : "border-white bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-orange-100 hover:shadow-md",
                )}
              >
                <span className={clsx(
                  "grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl",
                  visual.imageSrc
                    ? "bg-white"
                    : active ? "bg-white/95 text-orange-500" : `bg-gradient-to-br ${item.accent} text-white`,
                )}>
                  {visual.imageSrc ? (
                    <img src={visual.imageSrc} alt={`Ảnh môn ${item.name}`} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <ItemIcon className="h-8 w-8" strokeWidth={1.9} />
                  )}
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

        <section className="mt-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-3 text-2xl font-black">
              <Flame className="h-7 w-7 fill-orange-500 text-orange-500" /> Đề thi hot
            </h2>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {hotExams.slice(0, 3).map((exam) => (
              <article key={exam.id} className="relative overflow-hidden rounded-[1.65rem] border border-orange-100 bg-white px-4 pb-4 pt-5 shadow-sm sm:p-5">
                <span className="absolute right-0 top-0 rounded-bl-2xl bg-orange-500 px-4 py-2 text-xs font-black text-white">
                  {exam.weeklyParticipants} người thi tuần này
                </span>
                <div className="pt-7 sm:pt-6">
                  <span className="mb-2 inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">{exam.contentMode === "TOPIC" ? "Theo chuyên đề" : "Theo kỳ thi"}</span>
                  <h3 className="text-lg font-black leading-7 text-slate-800">{exam.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs font-extrabold uppercase text-slate-400">
                    <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4" />{exam.attemptCount.toLocaleString("vi-VN")} lượt thi</span>
                    <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4" />{exam.questionCount} câu</span>
                    <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{exam.durationMinutes} phút</span>
                  </div>
                  <Link
                    href={exam.href}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-600 transition hover:bg-orange-500 hover:text-white"
                  >
                    <Play className="h-4 w-4 fill-current" /> Làm bài ngay
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!hotExams.length ? (
            <div className="mt-4 rounded-[1.65rem] border-2 border-dashed border-orange-200 bg-white/70 px-5 py-8 text-center text-sm font-semibold text-slate-500">
              Chưa có đề thi được xuất bản cho môn học này.
            </div>
          ) : null}
        </section>

        <section className="mt-8">
          {mode === "topics" ? (
            <>
              <h2 className="text-lg font-black uppercase tracking-[0.08em] text-orange-500 sm:text-xl">Học theo chuyên đề</h2>

              <div className="mt-6">
                <h3 className="text-lg font-black text-slate-800">Đề luyện theo chuyên đề ({topicExams.length})</h3>
                {topicExams.length ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {topicExams.map((exam) => (
                      <article key={exam.id} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                        <h4 className="font-black leading-6 text-slate-800">{exam.title}</h4>
                        <p className="mt-2 text-xs font-bold text-slate-500">{exam.questionCount} câu · {exam.durationMinutes} phút · {exam.attemptCount.toLocaleString("vi-VN")} lượt làm</p>
                        <Link href={exam.href} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-600 hover:bg-orange-100">
                          <Play className="h-4 w-4" /> Luyện chuyên đề
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl border border-dashed border-orange-200 bg-white px-5 py-8 text-sm font-semibold text-slate-500">Chưa có đề luyện theo chuyên đề được xuất bản.</p>
                )}
              </div>

              <div className="mt-6 space-y-6">
                {subject.units.map((unit, unitIndex) => (
                  <section key={unit.title}>
                    <h3 className="text-xl font-black text-orange-600 sm:text-2xl">
                      Chương {unitIndex + 1}: {unit.title}
                      <span className="ml-3 text-sm font-bold text-slate-400">({unit.lessons.length} nội dung)</span>
                    </h3>
                    <div className="mt-4 space-y-4">
                      {unit.lessons.map((lesson, lessonIndex) => (
                        <article key={lesson} className="rounded-[1.6rem] border border-slate-200/80 bg-white px-5 py-5 shadow-sm sm:px-7">
                          <div className="flex min-w-0 gap-4">
                            <span className="text-lg font-black text-slate-400">{lessonIndex + 1}.</span>
                            <h4 className="font-bold leading-7 text-slate-700">{lesson}</h4>
                          </div>
                        </article>
                      ))}
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
              <h2 className="text-lg font-black uppercase tracking-[0.08em] text-orange-500 sm:text-xl">Học theo kì thi</h2>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {periodExams.map((exam) => (
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
              {!periodExams.length ? <p className="mt-6 rounded-2xl border border-dashed border-orange-200 bg-white px-5 py-10 text-center text-sm font-semibold text-slate-500">Chưa có đề theo kỳ thi được xuất bản.</p> : null}
            </>
          ) : null}

          {mode === "theory" ? (
            <>
              <h2 className="text-lg font-black uppercase tracking-[0.08em] text-orange-500 sm:text-xl">Học lý thuyết</h2>
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
