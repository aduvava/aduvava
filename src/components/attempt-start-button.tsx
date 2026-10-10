"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AttemptStartButton({ examId, disabled }: { examId: string; disabled?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function start() {
    setMessage("Đang tạo phiên làm bài...");
    const response = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId })
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
    <div>
      <button disabled={disabled} onClick={start} className="rounded-2xl bg-orange-500 px-10 py-4 text-lg font-black text-white shadow-lg shadow-orange-200 transition enabled:hover:-translate-y-0.5 enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
        Bắt đầu tính giờ →
      </button>
      {message ? <p className="mt-3 text-sm font-semibold text-ink/65">{message}</p> : null}
    </div>
  );
}
