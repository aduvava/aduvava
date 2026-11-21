"use client";

import { useState } from "react";

export type EssayGradeItem = {
  attemptId: string;
  questionId: string;
  examTitle: string;
  studentName: string;
  prompt: string;
  answer: string;
  maxScore: number;
  score: number | null;
  isGraded: boolean;
};

export function BcaEssayGrading({ initialItems }: { initialItems: EssayGradeItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  async function grade(item: EssayGradeItem) {
    const key = item.attemptId + ":" + item.questionId;
    const score = Number(scores[key] ?? (item.score === null ? "" : String(item.score)));
    if (!Number.isFinite(score) || score < 0 || score > item.maxScore || Math.round(score * 4) !== score * 4 ||
        (scores[key] === undefined && item.score === null)) {
      setMessage("Hãy nhập điểm từ 0 đến " + item.maxScore + ", theo bước 0,25.");
      return;
    }
    setSaving(key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/dgnl-bca-grading", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: item.attemptId, questionId: item.questionId, score, comment: comments[key] ?? "" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được điểm.");
      setItems((current) => current.map((entry) => entry.attemptId === item.attemptId && entry.questionId === item.questionId
        ? { ...entry, score, isGraded: true } : entry));
      setMessage("Đã lưu " + score + "/" + item.maxScore + " điểm tự luận. Tổng bài thi hiện là " + result.score + "/100.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không lưu được điểm.");
    } finally {
      setSaving(null);
    }
  }

  const pending = items.filter((item) => !item.isGraded).length;
  return (
    <div className="space-y-5">
      <p className="font-bold text-slate-700">{pending} câu tự luận chưa chấm · {items.length} bài được hiển thị</p>
      {message ? <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{message}</p> : null}
      {!items.length ? <p className="rounded-2xl bg-white p-6 text-slate-600">Chưa có bài BCA đã nộp để chấm.</p> : null}
      {items.map((item) => {
        const key = item.attemptId + ":" + item.questionId;
        return (
          <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-black text-slate-900">{item.examTitle}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">{item.studentName}</p>
              </div>
              <span className={item.isGraded ? "text-sm font-bold text-emerald-700" : "text-sm font-bold text-amber-700"}>
                {item.isGraded ? "Đã chấm " + item.score + "/" + item.maxScore : "Đang chờ chấm"}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-6">{item.prompt}</p>
            <div className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {item.answer || "(Không trả lời)"}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
              <label className="grid gap-1 text-sm font-bold">Điểm tự luận
                <input type="number" min={0} max={item.maxScore} step={0.25}
                  value={scores[key] ?? (item.score === null ? "" : String(item.score))}
                  onChange={(event) => setScores((old) => ({ ...old, [key]: event.target.value }))}
                  className="min-h-10 rounded-xl border border-slate-300 px-3" placeholder="0 – 25" />
              </label>
              <label className="grid gap-1 text-sm font-bold">Nhận xét (không bắt buộc)
                <input maxLength={2000} value={comments[key] ?? ""}
                  onChange={(event) => setComments((old) => ({ ...old, [key]: event.target.value }))}
                  className="min-h-10 rounded-xl border border-slate-300 px-3" placeholder="Nhận xét bài viết" />
              </label>
              <button type="button" disabled={saving !== null} onClick={() => void grade(item)}
                className="min-h-10 rounded-xl bg-orange-500 px-5 py-2 font-bold text-white disabled:opacity-50">
                {saving === key ? "Đang lưu..." : "Lưu điểm"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
