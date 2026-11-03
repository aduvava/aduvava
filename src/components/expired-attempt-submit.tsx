"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Once the server deadline has passed, never render the question payload.
// Only previously persisted answers are eligible for final scoring.
export function ExpiredAttemptSubmit({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [message, setMessage] = useState("Đã hết thời gian làm bài. Đang chấm các đáp án đã lưu...");
  const [pending, setPending] = useState(true);

  async function finish() {
    setPending(true);
    try {
      const response = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/submit`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Chưa thể hoàn tất bài thi. Vui lòng thử lại.");
        setPending(false);
        return;
      }
      router.replace(`/results/${data.resultId}`);
    } catch {
      setMessage("Không thể kết nối máy chủ. Vui lòng thử nộp lại.");
      setPending(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void finish();
  }, [attemptId]);

  return (
    <main className="mx-auto grid min-h-[55vh] max-w-xl place-items-center px-4 py-16">
      <section className="w-full rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-black text-slate-900">Đã hết giờ làm bài</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600" role="status">{message}</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => void finish()}
          className="mt-6 min-h-12 rounded-full bg-orange-500 px-8 font-bold text-white disabled:opacity-60"
        >
          {pending ? "Đang hoàn tất..." : "Thử nộp lại"}
        </button>
      </section>
    </main>
  );
}
