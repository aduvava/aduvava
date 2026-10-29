"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock3, Flag, Grid2X2, Pencil, Send, X } from "lucide-react";
import { clsx } from "clsx";
import { getQuestionPartLabel } from "@/lib/national-exam-rules";
import { RichContent as FormattedContent } from "@/components/rich-content";

type RunnerQuestion = {
  id: string;
  position: number;
  type: "SINGLE_CHOICE" | "TRUE_FALSE_SET" | "SHORT_ANSWER" | "ESSAY";
  prompt: string;
  passage?: string | null;
  points: number;
  answerOptions: { id: string; label: string; content: string }[];
};

type RunnerAnswer = { questionId: string; value: unknown };
type HelperItem = { id: string; name: string; kind: string; count: number; minutes?: number };

type ExamRunnerProps = {
  attemptId: string;
  examTitle: string;
  examDescription?: string | null;
  subjectSlug?: string;
  subjectName?: string;
  initialSeconds: number;
  questions: RunnerQuestion[];
  initialAnswers: RunnerAnswer[];
  submitEffect?: string | null;
  helpers?: HelperItem[];
};

function isAnswered(question: RunnerQuestion, value: unknown) {
  if (question.type === "TRUE_FALSE_SET") {
    const selections = typeof value === "object" && value !== null ? value as Record<string, boolean> : {};
    return question.answerOptions.every((option) => typeof selections[option.id] === "boolean");
  }
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function countWords(value: unknown) {
  return String(value ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function SubmitEffectOverlay({ effect }: { effect?: string | null }) {
  const isMeteor = effect === "meteor";
  const particles = Array.from({ length: isMeteor ? 18 : 22 });
  return (
    <div className="pointer-events-none fixed inset-0 z-[95] overflow-hidden bg-slate-950/25 backdrop-blur-[2px]">
      <div className="absolute inset-0 grid place-items-center">
        <div className="rounded-full bg-white/95 px-7 py-4 text-center shadow-2xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-orange-500">Đã nộp bài</p>
          <p className="mt-1 text-xl font-black text-slate-950">{isMeteor ? "Mưa sao băng" : "Pháo hoa"} đang kích hoạt</p>
        </div>
      </div>
      {particles.map((_, index) => (
        <span
          key={index}
          className={clsx(
            "absolute block rounded-full",
            isMeteor ? "h-1 w-20 rotate-[-28deg] bg-gradient-to-r from-transparent via-cyan-200 to-white" : "h-3 w-3 bg-yellow-300 shadow-[0_0_18px_rgba(251,191,36,0.9)]",
          )}
          style={{
            left: `${(index * 37) % 100}%`,
            top: isMeteor ? `${(index * 19) % 80}%` : `${20 + ((index * 23) % 55)}%`,
            animation: `${isMeteor ? "avaMeteor" : "avaFirework"} ${700 + (index % 5) * 90}ms ease-out forwards`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes avaFirework {
          from { transform: scale(.2) translateY(18px); opacity: 0; }
          35% { opacity: 1; }
          to { transform: scale(2.6) translateY(-28px); opacity: 0; }
        }
        @keyframes avaMeteor {
          from { transform: translate3d(120px,-80px,0) rotate(-28deg); opacity: 0; }
          25% { opacity: 1; }
          to { transform: translate3d(-220px,160px,0) rotate(-28deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function ExamRunner({ attemptId, examTitle, examDescription, subjectSlug, subjectName, initialSeconds, questions, initialAnswers, submitEffect, helpers = [] }: ExamRunnerProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => Object.fromEntries(initialAnswers.map((answer) => [answer.questionId, answer.value])));
  const answersRef = useRef<Record<string, unknown>>(answers);
  const dirtyRef = useRef<Set<string>>(new Set());
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const submittingRef = useRef(false);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [effectVisible, setEffectVisible] = useState(false);
  const [helperItems, setHelperItems] = useState(helpers);
  const [hiddenOptionIds, setHiddenOptionIds] = useState<Set<string>>(new Set());
  const [helperStatus, setHelperStatus] = useState("");
  const current = questions[index];
  const isLiteratureExam = subjectSlug === "ngu-van" || subjectName?.toLocaleLowerCase("vi").includes("ngữ văn");

  const answeredCount = useMemo(
    () => questions.filter((question) => isAnswered(question, answers[question.id])).length,
    [answers, questions],
  );
  const unansweredCount = questions.length - answeredCount;
  const groups = useMemo(() => {
    const result = new Map<string, Array<{ question: RunnerQuestion; globalIndex: number }>>();
    questions.forEach((question, globalIndex) => {
      const label = getQuestionPartLabel(question.type);
      const items = result.get(label) ?? [];
      items.push({ question, globalIndex });
      result.set(label, items);
    });
    return Array.from(result.entries());
  }, [questions]);
  const readingText = useMemo(() => {
    const passages = Array.from(new Set(questions.map((question) => question.passage?.trim()).filter(Boolean))) as string[];
    if (passages.length) {
      return passages
        .map((passage, passageIndex) => passages.length > 1 ? `Ngữ liệu ${passageIndex + 1}\n${passage}` : passage)
        .join("\n\n");
    }
    return examDescription || examTitle;
  }, [examDescription, examTitle, questions]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          void submit();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const autosave = window.setInterval(() => {
      const dirtyIds = Array.from(dirtyRef.current);
      if (!dirtyIds.length) return;
      setStatus("Đang tự động lưu...");
      Promise.all(dirtyIds.map((questionId) => persistAnswer(questionId, answersRef.current[questionId], true)))
        .then(() => setStatus("Đã tự động lưu"))
        .catch(() => setStatus("Tự động lưu thất bại"));
    }, 10000);
    return () => window.clearInterval(autosave);
  }, [attemptId]);

  async function persistAnswer(questionId: string, value: unknown, silent = false) {
    if (!silent) setStatus("Đang lưu...");
    // Serialize saves so a delayed old request cannot overwrite a newer response.
    const operation = saveQueueRef.current.catch(() => undefined).then(async () => {
      const response = await fetch(`/api/attempts/${attemptId}/answers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, value }),
      });
      if (!response.ok) throw new Error("Save failed");
      // Only mark saved if this is still the user's latest edit.
      if (JSON.stringify(answersRef.current[questionId]) === JSON.stringify(value)) {
        dirtyRef.current.delete(questionId);
      }
    });
    saveQueueRef.current = operation;
    await operation;
    if (!silent) setStatus("Đã lưu");
  }

  async function save(questionId: string, value: unknown) {
    const next = { ...answersRef.current, [questionId]: value };
    answersRef.current = next;
    dirtyRef.current.add(questionId);
    setAnswers(next);
    try {
      await persistAnswer(questionId, value);
    } catch {
      setStatus("Lưu thất bại, hệ thống sẽ thử lại khi tự động lưu");
    }
  }

  function updateDraft(questionId: string, value: unknown) {
    const next = { ...answersRef.current, [questionId]: value };
    answersRef.current = next;
    dirtyRef.current.add(questionId);
    setAnswers(next);
    setStatus("Đã ghi nháp, hệ thống sẽ tự động lưu mỗi 10 giây");
  }

  async function activateHelper(helper: HelperItem) {
    if (!current || helper.count <= 0) return;
    setHelperStatus("Đang dùng trợ giúp...");
    const response = await fetch(`/api/attempts/${attemptId}/helpers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: helper.id, questionId: current.id }),
    });
    const data = await response.json();
    if (!response.ok) {
      setHelperStatus(data.error ?? "Không thể dùng trợ giúp.");
      return;
    }
    setHelperItems((items) => items.map((item) => item.id === helper.id ? { ...item, count: Math.max(0, item.count - 1) } : item));
    if (Array.isArray(data.hiddenOptionIds)) {
      setHiddenOptionIds((currentIds) => new Set([...currentIds, ...data.hiddenOptionIds]));
    }
    if (typeof data.seconds === "number") {
      setSecondsLeft((value) => value + data.seconds);
    }
    setHelperStatus(data.message ?? `Đã dùng ${helper.name}.`);
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setStatus("Đang nộp bài...");
    // Drain pending writes before collecting unsaved changes.
    await saveQueueRef.current.catch(() => undefined);
    const dirtyIds = Array.from(dirtyRef.current);
    if (dirtyIds.length) {
      try {
        await Promise.all(dirtyIds.map((questionId) => persistAnswer(questionId, answersRef.current[questionId], true)));
      } catch {
        setSubmitting(false);
        setStatus("Chưa lưu được bài nháp. Vui lòng kiểm tra mạng rồi nộp lại.");
        return;
      }
    }
    const response = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
    const data = await response.json();
    if (response.ok) {
      if (submitEffect) {
        setEffectVisible(true);
        window.setTimeout(() => router.push(`/results/${data.resultId}`), 850);
      } else {
        router.push(`/results/${data.resultId}`);
      }
    }
    else {
      setSubmitting(false);
      setConfirmOpen(false);
      setStatus(data.error ?? "Không thể nộp bài");
    }
  }

  function toggleMarked(questionId: string) {
    setMarked((previous) => {
      const next = new Set(previous);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  if (!current) return null;
  const helperBar = helperItems.length ? (
    <div className="border-b border-orange-100 bg-orange-50/70 px-5 py-3 lg:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-black uppercase tracking-[0.18em] text-orange-500">Trợ giúp</span>
        {helperItems.map((helper) => (
          <button
            key={helper.id}
            type="button"
            onClick={() => void activateHelper(helper)}
            disabled={helper.count <= 0 || submitting}
            className="rounded-full border border-orange-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-orange-400 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {helper.name} x{helper.count}
          </button>
        ))}
        {helperStatus ? <span className="text-xs font-bold text-slate-500">{helperStatus}</span> : null}
      </div>
    </div>
  ) : null;

  if (isLiteratureExam) {
    return (
      <div className="exam-runner-page min-h-[calc(100vh-76px)] bg-[#fffdf6]">
        {effectVisible ? <SubmitEffectOverlay effect={submitEffect} /> : null}
        <div className="sticky top-[76px] z-30 flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 bg-white px-4 py-2.5 lg:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Bài làm Ngữ Văn</p>
            <h1 className="max-w-5xl text-base font-black leading-6 text-slate-900 lg:text-xl">{examTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-2xl bg-orange-50 px-3.5 py-2 text-base font-black text-orange-600">
              <Clock3 className="h-5 w-5" /> {minutes}:{seconds}
            </span>
            <button onClick={() => setConfirmOpen(true)} className="rounded-2xl bg-slate-900 px-4 py-2 font-black text-white transition hover:bg-orange-500">
              Nộp bài
            </button>
          </div>
        </div>
        {helperBar}

        <div className="grid lg:h-[calc(100vh-145px)] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <aside className="border-b border-orange-100 bg-white p-4 lg:h-full lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-6">
            <div className="mx-auto max-w-3xl">
              <span className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-orange-600">
                Ngữ liệu / Đề bài
              </span>
              <h2 className="mt-3 text-xl font-black text-slate-950">Đọc kỹ trước khi trả lời</h2>
              <div className="mt-4 whitespace-pre-line rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-[15px] leading-7 text-slate-700">
                <FormattedContent value={readingText} />
              </div>
              <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm leading-6 text-blue-800">
                Nửa trái được cuộn độc lập để bạn luôn đối chiếu ngữ liệu khi làm phần Đọc hiểu và Làm văn.
              </div>
            </div>
          </aside>

          <main className="bg-[#fffdf6] p-4 lg:h-full lg:overflow-y-auto lg:p-6">
            <div className="mx-auto max-w-4xl space-y-5">
              {questions.map((question, questionIndex) => {
                const value = answers[question.id];
                const partLabel = getQuestionPartLabel(question.type);
                return (
                  <article key={question.id} className="rounded-[1.75rem] border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-xs font-black text-orange-600">{partLabel}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleMarked(question.id)}
                        className={clsx(
                          "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition",
                          marked.has(question.id) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600 hover:bg-amber-50",
                        )}
                      >
                        <Flag className={clsx("h-5 w-5", marked.has(question.id) && "fill-current")} /> Đánh dấu
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-start gap-x-3 gap-y-1">
                      <h2 className="shrink-0 text-xl font-black leading-7 text-slate-900">Câu {questionIndex + 1}:</h2>
                      <FormattedContent value={question.prompt} className="min-w-0 flex-1 text-base font-semibold leading-7 text-slate-800" />
                    </div>

                    {question.type === "SINGLE_CHOICE" ? (
                      <div className="mx-auto mt-5 grid w-fit max-w-full gap-3 sm:grid-cols-2">
                        {question.answerOptions.map((option) => {
                          const selected = value === option.id;
                          const hiddenByHelper = hiddenOptionIds.has(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={hiddenByHelper}
                              onClick={() => void save(question.id, option.id)}
                              className={clsx(
                                "flex min-h-20 min-w-[18rem] max-w-full items-center gap-4 rounded-xl border-2 px-5 py-3 text-left transition",
                                hiddenByHelper && "cursor-not-allowed border-slate-100 bg-slate-50 opacity-35",
                                selected ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:border-orange-200",
                              )}
                            >
                              <span className={clsx("grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm font-black", selected ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300 bg-white text-slate-500")}>{option.label}</span>
                              <FormattedContent value={option.content} className="text-base font-semibold text-slate-700" imageClassName="max-h-44" />
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {question.type === "TRUE_FALSE_SET" ? (
                      <div className="mt-5 grid gap-3">
                        {question.answerOptions.map((option) => {
                          const selections = (value as Record<string, boolean> | undefined) ?? {};
                          return (
                            <div key={option.id} className="rounded-2xl border border-slate-200 p-4">
                              <div className="font-semibold leading-7 text-slate-700"><strong>{option.label}.</strong> <FormattedContent value={option.content} /></div>
                              <div className="mt-4 flex gap-3">
                                <button type="button" onClick={() => void save(question.id, { ...selections, [option.id]: true })} className={clsx("rounded-xl px-5 py-2.5 font-black", selections[option.id] === true ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600")}>Đúng</button>
                                <button type="button" onClick={() => void save(question.id, { ...selections, [option.id]: false })} className={clsx("rounded-xl px-5 py-2.5 font-black", selections[option.id] === false ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600")}>Sai</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {question.type === "SHORT_ANSWER" ? (
                      <div className="mt-6">
                        <label className="text-sm font-black uppercase tracking-wide text-slate-500">Trả lời ngắn</label>
                        <input className="mt-3 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-base font-bold outline-none focus:border-orange-400" value={(value as string) ?? ""} onChange={(event) => updateDraft(question.id, event.target.value)} placeholder="Nhập câu trả lời" />
                      </div>
                    ) : null}

                    {question.type === "ESSAY" ? (
                      <div className="mt-6 overflow-hidden rounded-[1.5rem] border-2 border-slate-200 bg-white focus-within:border-orange-400">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                          <div>
                            <p className="font-black text-slate-900">Khung soạn thảo tự luận</p>
                            <p className="text-xs font-semibold text-slate-400">Bài viết được tự động lưu mỗi 10 giây.</p>
                          </div>
                          <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-black text-orange-600">{countWords(value)} từ</span>
                        </div>
                        <textarea
                          className="min-h-[360px] w-full resize-y p-4 text-base leading-7 text-slate-800 outline-none"
                          value={(value as string) ?? ""}
                          onChange={(event) => updateDraft(question.id, event.target.value)}
                          onBlur={() => void persistAnswer(question.id, answersRef.current[question.id])}
                          placeholder="Nhập bài làm tự luận của bạn..."
                        />
                      </div>
                    ) : null}
                  </article>
                );
              })}

              <div className="sticky bottom-4 z-20 flex justify-center">
                <button onClick={() => setConfirmOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-7 py-3 font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600">
                  <Send className="h-5 w-5" /> Nộp bài
                </button>
              </div>
            </div>
          </main>
        </div>

        {confirmOpen ? (
          <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={() => setConfirmOpen(false)}>
            <div className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-2xl sm:p-10" onMouseDown={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => setConfirmOpen(false)} className="absolute sr-only"><X /></button>
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-orange-100 text-orange-500">
                <AlertCircle className="h-10 w-10" />
              </span>
              <h2 className="mt-6 text-3xl font-black text-slate-900">Xác nhận nộp bài</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Bạn còn <strong className="text-red-500">{unansweredCount} câu chưa hoàn thành</strong> và{" "}
                <strong className="text-amber-600">{marked.size} câu đang đánh dấu</strong> xem lại.
              </p>
              <p className="mt-6 text-base text-slate-500">Bạn có chắc chắn muốn nộp bài ngay bây giờ không?</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-2xl bg-slate-100 px-5 py-4 font-black text-slate-600">Quay lại làm tiếp</button>
                <button type="button" disabled={submitting} onClick={() => void submit()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 font-black text-white disabled:opacity-60">
                  <Send className="h-5 w-5" /> {submitting ? "Đang nộp..." : "Nộp bài ngay"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="exam-runner-page min-h-[calc(100vh-76px)] bg-white">
      {effectVisible ? <SubmitEffectOverlay effect={submitEffect} /> : null}
      <div className="sticky top-[76px] z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 lg:px-6">
        <h1 className="max-w-5xl text-base font-black leading-6 text-slate-900 lg:text-xl">{examTitle}</h1>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-orange-50 px-3.5 py-2 text-base font-black text-orange-600">
            <Clock3 className="h-5 w-5" /> {minutes}:{seconds}
          </span>
          <button onClick={() => setConfirmOpen(true)} className="rounded-2xl bg-slate-900 px-4 py-2 font-black text-white transition hover:bg-orange-500">
            Nộp bài
          </button>
        </div>
      </div>
      {helperBar}

      <div className="grid min-h-[calc(100vh-145px)] lg:grid-cols-[minmax(0,1fr)_380px]">
        <main className="px-4 py-6 lg:px-8 xl:px-12">
          <div className="mx-auto max-w-4xl space-y-5">
            {questions.map((question, questionIndex) => {
              const value = answers[question.id];
              const partLabel = getQuestionPartLabel(question.type);
              return (
                <article
                  key={question.id}
                  id={`question-${question.id}`}
                  className="scroll-mt-36 rounded-[1.75rem] border border-orange-100 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-xs font-black text-orange-600">{partLabel}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMarked(question.id)}
                      className={clsx(
                        "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition",
                        marked.has(question.id) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600 hover:bg-amber-50",
                      )}
                    >
                      <Flag className={clsx("h-5 w-5", marked.has(question.id) && "fill-current")} /> Đánh dấu xem lại
                    </button>
                  </div>

                  {question.passage ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600"><FormattedContent value={question.passage} /></div> : null}
                  <div className="mt-3 flex flex-wrap items-start gap-x-3 gap-y-1">
                    <h2 className="shrink-0 text-xl font-black leading-8 text-slate-900">Câu {questionIndex + 1}:</h2>
                    <FormattedContent value={question.prompt} className="min-w-0 flex-1 text-lg font-semibold leading-8 text-slate-800" />
                  </div>

                  {question.type === "SINGLE_CHOICE" ? (
                    <div className="mx-auto mt-6 grid w-fit max-w-full gap-3 sm:grid-cols-2">
                      {question.answerOptions.map((option) => {
                        const selected = value === option.id;
                        const hiddenByHelper = hiddenOptionIds.has(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            disabled={hiddenByHelper}
                            onClick={() => void save(question.id, option.id)}
                            className={clsx(
                              "flex min-h-20 min-w-[18rem] max-w-full items-center gap-4 rounded-xl border-2 px-5 py-3 text-left transition",
                              hiddenByHelper && "cursor-not-allowed border-slate-100 bg-slate-50 opacity-35",
                              selected ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:border-orange-200",
                            )}
                          >
                            <span className={clsx("grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm font-black", selected ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300 bg-white text-slate-500")}>{option.label}</span>
                            <FormattedContent value={option.content} className="text-base font-semibold text-slate-700" imageClassName="max-h-44" />
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {question.type === "TRUE_FALSE_SET" ? (
                    <div className="mt-6 grid gap-3">
                      {question.answerOptions.map((option) => {
                        const selections = (value as Record<string, boolean> | undefined) ?? {};
                        return (
                          <div key={option.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="font-semibold leading-7 text-slate-700"><strong>{option.label}.</strong> <FormattedContent value={option.content} /></div>
                            <div className="mt-4 flex gap-3">
                              <button type="button" onClick={() => void save(question.id, { ...selections, [option.id]: true })} className={clsx("rounded-xl px-5 py-2.5 font-black", selections[option.id] === true ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600")}>Đúng</button>
                              <button type="button" onClick={() => void save(question.id, { ...selections, [option.id]: false })} className={clsx("rounded-xl px-5 py-2.5 font-black", selections[option.id] === false ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600")}>Sai</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {question.type === "SHORT_ANSWER" ? (
                    <div className="mt-8">
                      <label className="text-sm font-black uppercase tracking-wide text-slate-500">Đáp án trả lời ngắn</label>
                      <input className="mt-3 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-base font-bold outline-none focus:border-orange-400" value={(value as string) ?? ""} onChange={(event) => updateDraft(question.id, event.target.value)} placeholder="Nhập đáp án" />
                    </div>
                  ) : null}

                  {question.type === "ESSAY" ? (
                    <div className="mt-8 overflow-hidden rounded-[1.5rem] border-2 border-slate-200 bg-white focus-within:border-orange-400">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <div>
                          <p className="font-black text-slate-900">Khung soạn thảo tự luận</p>
                          <p className="text-xs font-semibold text-slate-400">Bài viết được tự động lưu mỗi 10 giây.</p>
                        </div>
                        <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-black text-orange-600">{countWords(value)} từ</span>
                      </div>
                      <textarea
                        className="min-h-64 w-full resize-y p-4 leading-7 outline-none"
                        value={(value as string) ?? ""}
                        onChange={(event) => updateDraft(question.id, event.target.value)}
                        onBlur={() => void persistAnswer(question.id, answersRef.current[question.id])}
                        placeholder="Nhập bài làm tự luận..."
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}

            <div className="sticky bottom-4 z-20 flex justify-center">
              <button onClick={() => setConfirmOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-7 py-3 font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600">
                <Send className="h-5 w-5" /> {submitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            </div>
          </div>
        </main>

        <aside className="border-l border-slate-200 bg-slate-50/70 p-5 lg:sticky lg:top-[145px] lg:h-[calc(100vh-145px)] lg:overflow-y-auto">
          <h2 className="text-lg font-black text-slate-900">Bảng điều hướng</h2>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-2"><i className="h-4 w-4 rounded bg-orange-500" />Đã làm</span>
            <span className="flex items-center gap-2"><i className="h-4 w-4 rounded border-2 border-slate-900 bg-white" />Đang làm</span>
            <span className="flex items-center gap-2"><i className="h-4 w-4 rounded border border-slate-300 bg-white" />Chưa làm</span>
            <span className="flex items-center gap-2"><i className="h-4 w-4 rounded bg-amber-400" />Đánh dấu</span>
          </div>

          <div className="mt-6 space-y-6">
            {groups.map(([label, items], groupIndex) => (
              <section key={label}>
                <h3 className="flex items-center gap-2 font-black text-slate-700">
                  {groupIndex === 0 ? <Grid2X2 className="h-5 w-5 text-orange-500" /> : <Pencil className="h-5 w-5 text-blue-500" />}
                  {label}
                </h3>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {items.map(({ question, globalIndex }, localIndex) => {
                    const answered = isAnswered(question, answers[question.id]);
                    const active = globalIndex === index;
                    const isMarked = marked.has(question.id);
                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => {
                          setIndex(globalIndex);
                          document.getElementById(`question-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className={clsx(
                          "relative h-10 rounded-xl border text-sm font-black transition",
                          active && "border-2 border-slate-900 bg-white text-slate-900",
                          !active && answered && "border-orange-500 bg-orange-500 text-white",
                          !active && !answered && "border-slate-300 bg-white text-slate-600",
                        )}
                      >
                        {localIndex + 1}
                        {isMarked ? <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white" /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </aside>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={() => setConfirmOpen(false)}>
          <div className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-2xl sm:p-10" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setConfirmOpen(false)} className="absolute sr-only"><X /></button>
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-orange-100 text-orange-500">
              <AlertCircle className="h-10 w-10" />
            </span>
            <h2 className="mt-6 text-3xl font-black text-slate-900">Xác nhận nộp bài</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Bạn còn <strong className="text-red-500">{unansweredCount} câu chưa hoàn thành</strong> và{" "}
              <strong className="text-amber-600">{marked.size} câu đang đánh dấu</strong> xem lại.
            </p>
            <p className="mt-6 text-base text-slate-500">Bạn có chắc chắn muốn nộp bài ngay bây giờ không?</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-2xl bg-slate-100 px-5 py-4 font-black text-slate-600">Quay lại làm tiếp</button>
              <button type="button" disabled={submitting} onClick={() => void submit()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 font-black text-white disabled:opacity-60">
                <Send className="h-5 w-5" /> {submitting ? "Đang nộp..." : "Nộp bài ngay"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
