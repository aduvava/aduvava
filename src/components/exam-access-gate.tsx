"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export function ExamAccessGate({ examId, mode }: { examId: string; mode: "PASSWORD" | "RESTRICTED" | "PUBLIC" }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function unlock() {
    setLoading(true);
    setMessage("Đang kiểm tra...");
    const response = await fetch(`/api/exams/${examId}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setMessage(data.error ?? "Không thể mở khóa đề.");
    setMessage("Đã mở khóa đề.");
    router.refresh();
  }

  return (
    <section className="mt-9 rounded-[2rem] border border-orange-100 bg-orange-50 p-6 text-left sm:p-8">
      <div className="flex gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-orange-500">
          <LockKeyhole className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-2xl font-black text-slate-900">Đề thi đang được bảo vệ</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {mode === "PASSWORD"
              ? "Nhập mật khẩu do người tạo đề cung cấp để vào làm bài."
              : "Đề này chỉ dành cho các tài khoản đã được chủ đề cấp quyền truy cập."}
          </p>
        </div>
      </div>

      {mode === "PASSWORD" ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu đề thi"
            className="min-w-0 flex-1 rounded-2xl border border-orange-200 bg-white px-4 py-3 font-semibold outline-none focus:border-orange-400"
          />
          <button
            type="button"
            disabled={loading || !password.trim()}
            onClick={unlock}
            className="rounded-2xl bg-orange-500 px-6 py-3 font-black text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            Mở khóa
          </button>
        </div>
      ) : null}
      {message ? <p className="mt-4 text-sm font-bold text-orange-700">{message}</p> : null}
    </section>
  );
}
