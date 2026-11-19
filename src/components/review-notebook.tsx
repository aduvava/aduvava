"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookOpenCheck, CheckCircle2, CircleAlert, RotateCcw, Target } from "lucide-react";
import { RichContent } from "@/components/rich-content";

type Question = {
  id: string;
  type: "SINGLE_CHOICE" | "TRUE_FALSE_SET" | "SHORT_ANSWER" | "ESSAY";
  prompt: string;
  passage: string | null;
  points: number;
  options: { id: string; label: string; content: string }[];
};
type ReviewItem = {
  id: string;
  wrongCount: number;
  question: Question;
  subject: string;
  topic: string;
  examTitle: string;
};
type ReviewData = { total: number; mastered: number; pending: number; items: ReviewItem[] };
type Feedback = {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  mastered: boolean;
  explanation: string | null;
  correctText: string | null;
  correctOptions: { id: string; label: string }[];
  correctSelections: Record<string, boolean>;
};

export function ReviewNotebook() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [value, setValue] = useState<string | Record<string, boolean>>("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [finished, setFinished] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/review", { cache: "no-store" });
      const json = await response.json() as ReviewData & { error?: string };
      if (!response.ok) throw new Error(json.error || "Không tải được sổ lỗi sai.");
      setData(json);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const item = data?.items[0];
  const question = item?.question;

  function selectBoolean(optionId: string, selection: boolean) {
    if (feedback) return;
    setValue((previous) => ({
      ...(typeof previous === "object" && previous !== null ? previous : {}),
      [optionId]: selection,
    }));
  }

  const valid = question?.type === "SINGLE_CHOICE"
    ? typeof value === "string" && question.options.some((option) => option.id === value)
    : question?.type === "SHORT_ANSWER"
      ? typeof value === "string" && Boolean(value.trim())
      : question?.type === "TRUE_FALSE_SET"
        ? typeof value === "object" && question.options.every((option) => typeof value[option.id] === "boolean")
        : false;

  async function submit() {
    if (!item || !valid || busy || feedback) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, value }),
      });
      const json = await response.json() as Feedback & { error?: string };
      if (!response.ok) throw new Error(json.error || "Không lưu được kết quả.");
      setFeedback(json);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được câu trả lời.");
    } finally {
      setBusy(false);
    }
  }

  function nextQuestion() {
    setData((previous) => previous ? {
      ...previous,
      mastered: previous.mastered + (feedback?.mastered ? 1 : 0),
      pending: Math.max(0, previous.pending - (feedback?.mastered ? 1 : 0)),
      items: previous.items.slice(1),
    } : null);
    setFinished((count) => count + 1);
    setValue("");
    setFeedback(null);
    setError("");
  }

  return (
    <main className="min-h-screen bg-orange-50/40 pb-24">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="text-sm font-bold text-orange-600 hover:underline">← Trở về trang chủ</Link>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-black text-slate-900"><BookOpenCheck className="h-8 w-8 text-orange-500" /> Sổ lỗi sai</h1>
            <p className="mt-2 text-sm text-slate-600">Tự động lưu câu sai khi nộp đề. Ôn theo chu kỳ 1, 3 và 7 ngày để ghi nhớ lâu hơn.</p>
          </div>
          <Link href="/nang-luc" className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm font-bold text-orange-600 hover:bg-orange-50">
            <Target className="h-4 w-4" /> Xem điểm mạnh, điểm yếu
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[["Tổng câu từng sai", data?.total ?? 0], ["Đã thuộc", data?.mastered ?? 0], ["Đang ôn", data?.pending ?? 0]].map(([label, count]) => (
            <div key={label} className="rounded-2xl border border-orange-100 bg-white p-3 text-center shadow-sm sm:p-5">
              <p className="text-2xl font-black text-orange-600 sm:text-3xl">{count}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 sm:text-sm">{label}</p>
            </div>
          ))}
        </div>
        {loading ? <div className="mt-6 rounded-2xl bg-white p-6 text-slate-600">Đang tải các câu cần ôn...</div> : null}
        {error ? <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><CircleAlert className="h-4 w-4" />{error}</p> : null}
        {!loading && !item && !error ? (
          <div className="mt-6 rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="mt-4 text-2xl font-black text-slate-900">Hôm nay đã ôn xong!</h2>
            <p className="mt-2 text-slate-600">
              {finished ? "Bạn vừa luyện " + finished + " câu." : data?.total ? "Không có câu nào đến lịch ôn lúc này." : "Hoàn thành một đề để bắt đầu tạo sổ lỗi sai."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={() => { setFinished(0); void load(); }} className="inline-flex items-center gap-2 rounded-xl border border-orange-200 px-5 py-3 font-bold text-orange-600"><RotateCcw className="h-4 w-4" /> Kiểm tra câu đến hạn</button>
              <Link href="/exams" className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white">Tìm đề luyện tiếp</Link>
            </div>
          </div>
        ) : null}
        {item && question && !loading ? (
          <section className="mt-6 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-orange-600">
              <span>{item.subject} · {item.topic}</span>
              <span>Đã từng sai {item.wrongCount} lần · Đã ôn {finished} câu</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{item.examTitle}</p>
            {question.passage ? <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-7"><RichContent value={question.passage} /></div> : null}
            <div className="mt-5 text-base font-bold leading-7 text-slate-900"><RichContent value={question.prompt} /></div>
            {question.type === "SINGLE_CHOICE" ? (
              <div className="mt-5 space-y-2">
                {question.options.map((option) => (
                  <button key={option.id} type="button" disabled={Boolean(feedback)} onClick={() => setValue(option.id)}
                    className={"flex min-h-12 w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition " +
                      (value === option.id ? "border-orange-500 bg-orange-50 text-orange-950" : "border-slate-200 hover:border-orange-200")}>
                    <strong className="shrink-0">{option.label}.</strong><RichContent value={option.content} />
                  </button>
                ))}
              </div>
            ) : null}
            {question.type === "TRUE_FALSE_SET" ? (
              <div className="mt-5 space-y-3">
                {question.options.map((option) => (
                  <div key={option.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 text-sm"><strong>{option.label}.</strong> <RichContent value={option.content} /></div>
                    <div className="flex gap-2">
                      {[true, false].map((choice) => (
                        <button type="button" key={String(choice)} disabled={Boolean(feedback)} onClick={() => selectBoolean(option.id, choice)}
                          className={"rounded-lg border px-4 py-2 text-sm font-bold " +
                            (typeof value === "object" && value[option.id] === choice ? "border-orange-500 bg-orange-50 text-orange-600" : "border-slate-200 text-slate-600")}>
                          {choice ? "Đúng" : "Sai"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {question.type === "SHORT_ANSWER" ? (
              <input type="text" value={typeof value === "string" ? value : ""} onChange={(event) => setValue(event.target.value)}
                disabled={Boolean(feedback)} maxLength={500} placeholder="Nhập đáp án của bạn..."
                className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500" />
            ) : null}
            {feedback ? (
              <div className={"mt-6 rounded-2xl p-4 " + (feedback.isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950")}>
                <h2 className="font-black">{feedback.isCorrect ? "Chính xác!" : "Chưa chính xác, hãy xem lại nhé."}</h2>
                <p className="mt-1 text-sm">Điểm: {feedback.score}/{feedback.maxScore}</p>
                {question.type === "SHORT_ANSWER" ? <p className="mt-2 text-sm">Đáp án: {feedback.correctText || "Xem lời giải bên dưới."}</p> : null}
                {question.type === "SINGLE_CHOICE" ? <p className="mt-2 text-sm">Đáp án: {feedback.correctOptions.map((option) => option.label).join(", ")}</p> : null}
                {question.type === "TRUE_FALSE_SET" ? <p className="mt-2 text-sm">Đáp án: {question.options.map((option) => option.label + ": " + (feedback.correctSelections[option.id] ? "Đúng" : "Sai")).join(" · ")}</p> : null}
                {feedback.explanation ? <div className="mt-3 border-t border-current/10 pt-3 text-sm leading-7"><RichContent value={feedback.explanation} /></div> : null}
                <p className="mt-3 text-xs">{feedback.mastered ? "Bạn đã thuộc câu này!" : "Educhi đã lưu lịch ôn tiếp theo."}</p>
              </div>
            ) : null}
            <div className="mt-6 flex justify-end">
              {!feedback ? (
                <button type="button" onClick={() => void submit()} disabled={!valid || busy}
                  className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? "Đang kiểm tra..." : "Kiểm tra đáp án"}
                </button>
              ) : (
                <button type="button" onClick={nextQuestion} className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white">Câu tiếp theo →</button>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
