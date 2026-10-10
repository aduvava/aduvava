"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, ExternalLink, Lock, Save, Users } from "lucide-react";
import { clsx } from "clsx";

type LibraryExam = {
  id: string;
  title: string;
  subjectName: string;
  durationMinutes: number;
  questionCount: number;
  attemptCount: number;
  shareMode: "PUBLIC" | "PASSWORD" | "RESTRICTED";
  shareToken: string | null;
  accessEmails: string[];
  createdAt: string;
};

export function MyExamLibrary({ exams }: { exams: LibraryExam[] }) {
  const [drafts, setDrafts] = useState(() => Object.fromEntries(exams.map((exam) => [
    exam.id,
    {
      shareMode: exam.shareMode,
      password: "",
      accessEmails: exam.accessEmails.join("\n"),
    },
  ])));
  const [message, setMessage] = useState<Record<string, string>>({});

  function shareUrl(exam: LibraryExam) {
    const path = exam.shareToken ? `/exams/share/${exam.shareToken}` : `/exams/${exam.id}`;
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }

  async function copyLink(exam: LibraryExam) {
    await navigator.clipboard?.writeText(shareUrl(exam));
    setMessage((current) => ({ ...current, [exam.id]: "Đã sao chép link chia sẻ." }));
  }

  async function saveSharing(exam: LibraryExam) {
    const draft = drafts[exam.id];
    setMessage((current) => ({ ...current, [exam.id]: "Đang lưu..." }));
    const response = await fetch(`/api/exams/${exam.id}/sharing`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shareMode: draft.shareMode,
        password: draft.password || undefined,
        accessEmails: draft.accessEmails.split(/[\n,;]/).map((email) => email.trim()).filter(Boolean),
      }),
    });
    const data = await response.json();
    setMessage((current) => ({ ...current, [exam.id]: response.ok ? "Đã cập nhật quyền truy cập." : data.error ?? "Lưu thất bại." }));
  }

  const hasExam = exams.length > 0;

  return (
    <div className="space-y-5">
      {!hasExam ? (
        <div className="rounded-[2rem] border border-dashed border-orange-200 bg-white p-10 text-center">
          <p className="text-lg font-black text-slate-900">Bạn chưa tạo đề nào.</p>
          <Link href="/exams/create" className="mt-5 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white">
            Tạo đề đầu tiên
          </Link>
        </div>
      ) : null}

      {exams.map((exam) => {
        const draft = drafts[exam.id];
        const modeLabel = draft.shareMode === "PUBLIC" ? "Công khai" : draft.shareMode === "PASSWORD" ? "Có mật khẩu" : "Giới hạn email";
        return (
          <article key={exam.id} className="rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">{exam.subjectName}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{modeLabel}</span>
                </div>
                <h2 className="mt-3 text-2xl font-black text-slate-900">{exam.title}</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {exam.questionCount} câu · {exam.durationMinutes} phút · {exam.attemptCount} lượt làm
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copyLink(exam)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-orange-50 hover:text-orange-600">
                  <Copy className="h-4 w-4" /> Copy link
                </button>
                <Link href={exam.shareToken ? `/exams/share/${exam.shareToken}` : `/exams/${exam.id}`} className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:bg-orange-600">
                  <ExternalLink className="h-4 w-4" /> Xem đề
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 lg:grid-cols-[220px_1fr_1fr_auto]">
              <label className="text-sm font-bold text-slate-700">
                Chế độ
                <select
                  value={draft.shareMode}
                  onChange={(event) => setDrafts((current) => ({ ...current, [exam.id]: { ...draft, shareMode: event.target.value as LibraryExam["shareMode"] } }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-400"
                >
                  <option value="PUBLIC">Công khai bằng link</option>
                  <option value="PASSWORD">Yêu cầu mật khẩu</option>
                  <option value="RESTRICTED">Chỉ email được cấp quyền</option>
                </select>
              </label>

              <label className={clsx("text-sm font-bold text-slate-700", draft.shareMode !== "PASSWORD" && "opacity-50")}>
                Mật khẩu mới
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-orange-400">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    value={draft.password}
                    disabled={draft.shareMode !== "PASSWORD"}
                    onChange={(event) => setDrafts((current) => ({ ...current, [exam.id]: { ...draft, password: event.target.value } }))}
                    placeholder="Để trống nếu không đổi"
                    className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                  />
                </div>
              </label>

              <label className="text-sm font-bold text-slate-700">
                Email được cấp quyền
                <div className="mt-2 flex gap-2 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-orange-400">
                  <Users className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                  <textarea
                    value={draft.accessEmails}
                    onChange={(event) => setDrafts((current) => ({ ...current, [exam.id]: { ...draft, accessEmails: event.target.value } }))}
                    placeholder="Mỗi dòng một email"
                    className="min-h-14 min-w-0 flex-1 resize-y bg-transparent outline-none"
                  />
                </div>
              </label>

              <button type="button" onClick={() => saveSharing(exam)} className="inline-flex h-12 items-center justify-center gap-2 self-end rounded-2xl bg-slate-900 px-5 text-sm font-black text-white hover:bg-orange-500">
                <Save className="h-4 w-4" /> Lưu
              </button>
            </div>

            {message[exam.id] ? (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                <Check className="h-4 w-4" /> {message[exam.id]}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
