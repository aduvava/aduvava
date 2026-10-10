"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Eye, LoaderCircle, X } from "lucide-react";
import { clsx } from "clsx";

type ModerationDocument = {
  id: string;
  title: string;
  description: string;
  grade: string;
  subject: string;
  type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  originalName: string;
  uploaderName: string;
  downloads: number;
  averageRating: number;
  reports: number;
  createdAt: string;
};

export function DocumentModeration({ documents }: { documents: ModerationDocument[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function moderate(id: string, action: "APPROVE" | "REJECT") {
    const reason =
      action === "REJECT"
        ? window.prompt("Lý do từ chối tài liệu:", "Nội dung chưa đáp ứng tiêu chuẩn cộng đồng.") ?? undefined
        : undefined;
    if (action === "REJECT" && reason === undefined) return;

    setBusyId(id);
    await fetch(`/api/admin/documents/${id}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      {documents.map((document) => (
        <article key={document.id} className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={clsx(
                    "rounded-full px-3 py-1 text-[11px] font-extrabold",
                    document.status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-600"
                      : document.status === "REJECTED"
                        ? "bg-red-50 text-red-600"
                        : "bg-amber-50 text-amber-600",
                  )}
                >
                  {document.status}
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-600">
                  {document.grade} · {document.subject}
                </span>
                {document.reports ? (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-600">{document.reports} báo cáo</span>
                ) : null}
              </div>
              <h2 className="mt-3 text-xl font-black text-slate-800">{document.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">{document.description}</p>
              <p className="mt-3 text-xs text-slate-400">
                {document.uploaderName} · {document.originalName} · {document.downloads} lượt tải · {document.averageRating.toFixed(1)} sao
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <a
                href={`/api/documents/${document.id}/preview`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-4 py-2.5 text-sm font-extrabold text-blue-600"
              >
                <Eye className="h-4 w-4" />
                Xem
              </a>
              <button
                type="button"
                onClick={() => moderate(document.id, "APPROVE")}
                disabled={busyId === document.id}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {busyId === document.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Phê duyệt
              </button>
              <button
                type="button"
                onClick={() => moderate(document.id, "REJECT")}
                disabled={busyId === document.id}
                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Từ chối
              </button>
            </div>
          </div>
        </article>
      ))}
      {!documents.length ? (
        <div className="rounded-[1.75rem] border-2 border-dashed border-slate-200 p-12 text-center text-slate-500">
          Chưa có tài liệu nào trong hàng đợi.
        </div>
      ) : null}
    </div>
  );
}
