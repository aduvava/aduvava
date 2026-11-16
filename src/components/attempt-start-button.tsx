"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AttemptStartButton({ examId, disabled, label = "Bắt đầu tính giờ →" }: { examId: string; disabled?: boolean; label?: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"PRACTICE" | "MOCK">("MOCK");
  const [minutes, setMinutes] = useState(45);
  const router = useRouter();

  async function start() {
    setMessage("Đang tạo phiên làm bài...");
    const response = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId, mode, ...(mode === "PRACTICE" ? { timeLimitMinutes: minutes } : {}) })
    });

    if (response.status === 401) {
      router.push(`/login?callbackUrl=/exams/${examId}`);
      return;
    }

    if (response.status === 402) {
      router.push("/vip");
      return;
    }

    const data = await response.json();
    if (response.ok) router.push(`/attempts/${data.attemptId}`);
    else setMessage(data.error ?? "Không thể bắt đầu đề.");
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 grid grid-cols-2 gap-3 text-left">
        <button type="button" aria-pressed={mode === "PRACTICE"} onClick={() => setMode("PRACTICE")} className={`rounded-2xl border-2 p-4 text-sm font-bold ${mode === "PRACTICE" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-700"}`}>
          <span className="block text-lg">📖 Luyện đề</span>
          <span className="mt-1 block text-xs font-medium">Xem đáp án và giải thích sau mỗi câu</span>
        </button>
        <button type="button" aria-pressed={mode === "MOCK"} onClick={() => setMode("MOCK")} className={`rounded-2xl border-2 p-4 text-sm font-bold ${mode === "MOCK" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-700"}`}>
          <span className="block text-lg">⏱️ Thi thử</span>
          <span className="mt-1 block text-xs font-medium">Xem kết quả sau khi nộp toàn đề</span>
        </button>
      </div>
      {mode === "PRACTICE" ? (
        <label className="mb-4 flex items-center justify-center gap-3 text-sm font-bold text-slate-700">
          Thời gian luyện đề
          <select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className="rounded-xl border border-orange-200 bg-white px-3 py-2">
            {[15, 30, 45, 60, 90, 120, 180].map((value) => <option key={value} value={value}>{value} phút</option>)}
          </select>
        </label>
      ) : null}
      <button disabled={disabled} onClick={start} className="rounded-2xl bg-orange-500 px-10 py-4 text-lg font-black text-white shadow-lg shadow-orange-200 transition enabled:hover:-translate-y-0.5 enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
        {label}
      </button>
      {message ? <p className="mt-3 text-sm font-semibold text-ink/65">{message}</p> : null}
    </div>
  );
}
