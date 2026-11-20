"use client";

import { useCallback, useEffect, useState } from "react";

type RequestItem = {
  id: string;
  source: string;
  name: string;
  email: string;
  phone: string | null;
  userId: string | null;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  processedAt: string | null;
};

const categories = [
  { value: "", label: "Tất cả yêu cầu" },
  { value: "privacy-request", label: "Quyền dữ liệu" },
  { value: "community-report", label: "Báo cáo cộng đồng" },
  { value: "service-page", label: "Liên hệ website" },
  { value: "website", label: "Yêu cầu khác" },
];
const statuses = [
  { value: "OPEN", label: "Mới" },
  { value: "IN_REVIEW", label: "Đang xác minh" },
  { value: "RESOLVED", label: "Đã xử lý" },
  { value: "DISMISSED", label: "Đã đóng" },
];
const statusName = (value: string) => statuses.find((item) => item.value === value)?.label ?? value;

export function AdminComplianceInbox() {
  const [source, setSource] = useState("");
  const [items, setItems] = useState<RequestItem[]>([]);
  const [pending, setPending] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("OPEN");
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const messageId = selected?.source === "community-report"
    ? /^Mã tin nhắn: ([a-zA-Z0-9_-]+)\n/.exec(selected.message)?.[1] ?? null
    : null;

  const load = useCallback(async (keepId?: string | null) => {
    setLoading(true);
    try {
      const query = source ? "?source=" + encodeURIComponent(source) : "";
      const response = await fetch("/api/admin/requests" + query, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được yêu cầu.");
      const rows = data.items as RequestItem[];
      setItems(rows);
      setPending(data.pending as number);
      const target = rows.find((row) => row.id === keepId) ?? rows[0] ?? null;
      setSelectedId(target?.id ?? null);
      setStatus(target?.status ?? "OPEN");
      setAdminNote(target?.adminNote ?? "");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Lỗi kết nối.");
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => { void load(); }, [load]);

  function choose(item: RequestItem) {
    setSelectedId(item.id);
    setStatus(item.status);
    setAdminNote(item.adminNote ?? "");
    setNotice("");
  }

  async function save() {
    if (!selected || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, status, adminNote }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không cập nhật được.");
      await load(selected.id);
      setNotice("Đã lưu trạng thái và ghi chú nội bộ. Chưa tự động gửi email cho người yêu cầu.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Lỗi kết nối."); }
    finally { setBusy(false); }
  }

  async function removeMessage() {
    if (!selected || !messageId || busy) return;
    if (!window.confirm("Xác nhận gỡ tin nhắn cộng đồng này? Hành động không thể hoàn tác.")) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/requests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, messageId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không gỡ được tin nhắn.");
      await load(selected.id);
      setNotice(data.removed ? "Đã gỡ tin nhắn và đóng báo cáo." : "Tin nhắn không còn tồn tại; báo cáo đã được đóng.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Lỗi kết nối."); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-8 text-slate-900 md:px-8">
      <header>
        <p className="text-xs font-black uppercase tracking-widest text-orange-600">Educhi Admin · An toàn & tuân thủ</p>
        <h1 className="mt-2 text-2xl font-black">Yêu cầu dữ liệu & báo cáo vi phạm</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Xác minh chủ thể trước khi xử lý/xóa dữ liệu. Không tự động xóa tài khoản khi nhận yêu cầu;
          kiểm tra nghĩa vụ lưu trữ thanh toán và quyền của người chưa thành niên.
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4">
        <span className="text-sm font-bold">Chưa giải quyết: <strong className="text-orange-600">{pending}</strong></span>
        <label htmlFor="request-source" className="text-sm font-semibold">Loại yêu cầu:</label>
        <select id="request-source" value={source} onChange={(event) => setSource(event.target.value)}
          className="rounded-xl border px-3 py-2 text-sm">
          {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <button type="button" onClick={() => void load(selectedId)} className="rounded-xl border px-4 py-2 text-sm font-bold">Làm mới</button>
      </div>
      {notice ? <p role="status" className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-slate-800">{notice}</p> : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(250px,360px)_1fr]">
        <aside aria-label="Danh sách yêu cầu" className="max-h-[45rem] space-y-2 overflow-y-auto rounded-2xl border bg-white p-3">
          {loading && !items.length ? <p className="p-4 text-sm text-slate-500">Đang tải...</p> : null}
          {!loading && !items.length ? <p className="p-4 text-sm text-slate-500">Chưa có yêu cầu.</p> : null}
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => choose(item)}
              className={`w-full rounded-xl border p-3 text-left ${item.id === selectedId ? "border-orange-400 bg-orange-50" : "border-slate-200"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-extrabold">{item.name}</span>
                <span className="shrink-0 text-[10px] font-bold text-orange-700">{statusName(item.status)}</span>
              </div>
              <span className="block truncate text-xs text-slate-500">{item.email}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-600">{item.source}</span>
              <span className="mt-1 block truncate text-xs text-slate-500">{item.message}</span>
            </button>
          ))}
        </aside>
        <section aria-label="Chi tiết yêu cầu" className="min-h-[24rem] rounded-2xl border bg-white p-5">
          {!selected ? <p className="text-sm text-slate-500">Chọn một yêu cầu để kiểm tra.</p> : (
            <div className="space-y-4">
              <h2 className="text-lg font-black">Yêu cầu {selected.id}</h2>
              <p className="text-sm leading-6 text-slate-700">
                <strong>{selected.name}</strong> · {selected.email}
                {selected.phone ? " · " + selected.phone : ""}
              </p>
              <p className="text-xs text-slate-500">{new Date(selected.createdAt).toLocaleString("vi-VN")} ·
                {selected.userId ? " Yêu cầu gắn với tài khoản đã đăng nhập" : " Chưa xác minh chủ tài khoản"}
              </p>
              <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6">{selected.message}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold">Trạng thái
                  <select aria-label="Trạng thái xử lý" value={status} onChange={(e) => setStatus(e.target.value)}
                    className="mt-2 block w-full rounded-xl border px-3 py-2 font-medium">
                    {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  Ghi chú chỉ dành cho Admin, không hiển thị cho học sinh.
                  Việc đánh dấu đã xử lý không thay thế hành động khắc phục thực tế.
                </p>
              </div>
              <label className="block text-sm font-bold">Ghi chú nội bộ
                <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)}
                  maxLength={1500} rows={4} className="mt-2 block w-full rounded-xl border p-3 text-sm"
                  placeholder="Xác minh, quyết định, hành động và căn cứ..." />
              </label>
              <div className="flex flex-wrap gap-3">
                <button type="button" disabled={busy} onClick={() => void save()}
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                  {busy ? "Đang xử lý..." : "Lưu trạng thái"}
                </button>
                {messageId ? <button type="button" disabled={busy} onClick={() => void removeMessage()}
                  className="rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-50">
                  Gỡ tin nhắn bị báo cáo
                </button> : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
