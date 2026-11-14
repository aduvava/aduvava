"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, MessageSquare, RefreshCw, Send } from "lucide-react";

type ChatMessage = {
  id: string;
  sender: "USER" | "AI" | "ADMIN" | "SYSTEM";
  content: string;
  createdAt: string;
  costMicroUsd: number;
};

type ChatSummary = {
  id: string;
  status: "AI" | "WAITING_ADMIN" | "RESOLVED";
  updatedAt: string;
  user: { id: string; name: string | null; email: string };
  messages: Array<{ content: string; sender: string }>;
};

type Inbox = {
  conversations: ChatSummary[];
  selected: { id: string; status: ChatSummary["status"] } | null;
  messages: ChatMessage[];
  pending: number;
  budget: {
    month: string; enabled: boolean; model: string; spentUsd: number;
    heldUsd: number; capUsd: number; dailyLimit: number;
  };
};

export function AdminSupportInbox() {
  const [data, setData] = useState<Inbox | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load(threadId?: string) {
    setLoading(true);
    setError("");
    try {
      const params = threadId ? `?conversationId=${encodeURIComponent(threadId)}` : "";
      const response = await fetch(`/api/support/admin${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không tải được hội thoại.");
      setData(result as Inbox);
      setSelectedId((result as Inbox).selected?.id ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể kết nối.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "nearest" }); }, [data?.messages]);

  async function act(action: "reply" | "resolve") {
    const id = selectedId;
    if (!id || sending || (action === "reply" && !reply.trim())) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/support/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action, conversationId: id,
          ...(action === "reply" ? { message: reply.trim() } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không thể xử lý yêu cầu.");
      setData(result as Inbox);
      setReply("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể kết nối.");
    } finally {
      setSending(false);
    }
  }

  const sorted = [...(data?.conversations ?? [])].sort((a, b) => {
    if (a.status === "WAITING_ADMIN" && b.status !== "WAITING_ADMIN") return -1;
    if (b.status === "WAITING_ADMIN" && a.status !== "WAITING_ADMIN") return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 text-slate-900 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-600">Educhi Admin</p>
          <h1 className="mt-1 text-2xl font-black">Hỗ trợ học sinh</h1>
          <p className="mt-1 text-sm text-slate-600">Trả lời yêu cầu chuyển từ chatbot AI. Chỉ Admin có quyền đọc toàn bộ các hội thoại.</p>
        </div>
        <button type="button" onClick={() => void load(selectedId ?? undefined)}
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Làm mới
        </button>
      </div>

      {data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm font-semibold text-slate-500">Chờ Admin trả lời</p>
            <p className="mt-1 text-2xl font-black text-orange-600">{data.pending}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm font-semibold text-slate-500">Chi phí AI ước tính · {data.budget.month}</p>
            <p className="mt-1 text-xl font-black">
              ${data.budget.spentUsd.toFixed(4)} / ${data.budget.capUsd.toFixed(2)} USD
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm font-semibold text-slate-500">Trạng thái AI</p>
            <p className="mt-1 font-black">{data.budget.enabled ? "Đang bật" : "Chưa bật / thiếu khóa"}</p>
            <p className="text-xs text-slate-500">{data.budget.model} · {data.budget.dailyLimit} lượt/người/ngày</p>
          </div>
        </div>
      ) : null}

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading && !data ? <p>Đang tải hội thoại…</p> : null}

      <div className="grid min-h-[30rem] gap-4 lg:grid-cols-[minmax(250px,320px)_1fr]">
        <aside className="max-h-[37rem] overflow-y-auto rounded-2xl border bg-white p-3">
          <p className="mb-3 px-2 font-extrabold">Hộp thư ({sorted.length})</p>
          {sorted.map((thread) => (
            <button key={thread.id} type="button" onClick={() => void load(thread.id)}
              className={`mb-2 w-full rounded-xl border p-3 text-left hover:border-orange-300 ${selectedId === thread.id ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-bold">{thread.user.name || thread.user.email}</span>
                {thread.status === "WAITING_ADMIN" ? <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-700">Chờ xử lý</span> : null}
              </div>
              <span className="block truncate text-xs text-slate-500">{thread.user.email}</span>
              <span className="mt-1 block truncate text-xs text-slate-600">{thread.messages[0]?.content ?? "Hội thoại mới"}</span>
            </button>
          ))}
          {data && sorted.length === 0 ? <p className="p-3 text-sm text-slate-500">Chưa có cuộc trò chuyện.</p> : null}
        </aside>

        <section className="flex min-h-[30rem] flex-col overflow-hidden rounded-2xl border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-2 font-extrabold"><MessageSquare className="h-5 w-5 text-orange-500" />
              {data?.selected ? "Nội dung hội thoại" : "Chọn một hội thoại"}
            </div>
            {data?.selected?.status === "WAITING_ADMIN" ? (
              <button type="button" disabled={sending} onClick={() => void act("resolve")}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" /> Đánh dấu đã xử lý
              </button>
            ) : null}
          </div>
          <div className="max-h-[26rem] min-h-[19rem] flex-1 space-y-3 overflow-y-auto bg-orange-50/30 p-4">
            {data?.messages.map((message) => (
              <article key={message.id} className={`max-w-[90%] rounded-xl p-3 text-sm shadow-sm ${message.sender === "USER" ? "ml-auto bg-orange-100" : "mr-auto bg-white"}`}>
                <p className="mb-1 text-[11px] font-extrabold uppercase text-orange-700">
                  {message.sender === "USER" ? "Học sinh" : message.sender === "AI" ? "AI" : message.sender === "ADMIN" ? "Admin" : "Hệ thống"}
                </p>
                <p className="whitespace-pre-wrap break-words text-slate-800">{message.content}</p>
                <p className="mt-1 text-[10px] text-slate-500">{new Date(message.createdAt).toLocaleString("vi-VN")}</p>
              </article>
            ))}
            <div ref={bottomRef} />
          </div>
          {data?.selected ? (
            <form onSubmit={(event) => { event.preventDefault(); void act("reply"); }} className="border-t p-3">
              <textarea aria-label="Trả lời học sinh" value={reply} maxLength={3000} rows={3}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Nhập câu trả lời cho học sinh…"
                className="w-full resize-y rounded-xl border p-3 text-sm outline-none focus:border-orange-400" />
              <div className="mt-2 flex justify-end">
                <button type="submit" disabled={sending || !reply.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                  <Send className="h-4 w-4" /> {sending ? "Đang gửi…" : "Gửi phản hồi"}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
      <p className="text-xs text-slate-500">Báo cáo chi phí chỉ là ước tính theo số token. Đối chiếu với OpenAI Platform Billing để biết phí thực tế.</p>
    </div>
  );
}
