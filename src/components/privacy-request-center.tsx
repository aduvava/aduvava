"use client";

import { useEffect, useState } from "react";
import { privacyRequestOptions, type PrivacyRequestType } from "@/lib/compliance-requests";

type PrivacyItem = {
  id: string;
  message: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
};
const statusText: Record<string, string> = {
  OPEN: "Đã tiếp nhận",
  IN_REVIEW: "Đang xác minh",
  RESOLVED: "Đã đánh dấu xử lý",
  DISMISSED: "Đã đóng",
};

export function PrivacyRequestCenter({ email }: { email: string }) {
  const [type, setType] = useState<PrivacyRequestType>("ACCESS");
  const [details, setDetails] = useState("");
  const [items, setItems] = useState<PrivacyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/privacy-requests", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không tải được lịch sử yêu cầu.");
      setItems(result.items ?? []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không tải được lịch sử.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setNotice("");
    try {
      const response = await fetch("/api/privacy-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không gửi được yêu cầu.");
      setNotice(result.message + " Mã yêu cầu: " + result.request.id);
      setDetails("");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không gửi được yêu cầu.");
    } finally { setSending(false); }
  }

  return (
    <div className="mt-8 space-y-7">
      <form onSubmit={(event) => void submit(event)} className="space-y-4 rounded-2xl border border-orange-100 bg-orange-50/50 p-4 sm:p-6">
        <h2 className="text-lg font-black">Tạo yêu cầu</h2>
        <p className="text-sm text-slate-600">Tài khoản: <strong>{email}</strong>. Email được xác định từ phiên đăng nhập, không thể thay bằng email người khác.</p>
        <label htmlFor="privacy-kind" className="block text-sm font-bold">Nội dung cần hỗ trợ
          <select id="privacy-kind" value={type} onChange={(event) => setType(event.target.value as PrivacyRequestType)}
            className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium">
            {privacyRequestOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label htmlFor="privacy-detail" className="block text-sm font-bold">Thông tin bổ sung (không bắt buộc)
          <textarea id="privacy-detail" rows={4} maxLength={1200} value={details}
            onChange={(event) => setDetails(event.target.value)}
            className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
            placeholder="Mô tả dữ liệu hoặc vấn đề cần giải quyết. Không gửi mật khẩu, mã OTP, số giấy tờ tùy thân..." />
        </label>
        <p className="text-xs leading-6 text-slate-600">Educhi có thể yêu cầu xác minh bổ sung và xem xét nghĩa vụ lưu trữ hợp pháp trước khi chỉnh sửa/xóa. Không có hành động xóa tự động ở bước này.</p>
        <button type="submit" disabled={sending}
          className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
          {sending ? "Đang gửi..." : "Gửi yêu cầu"}
        </button>
      </form>
      {notice ? <p role="status" className="rounded-xl bg-white p-4 text-sm leading-6 text-slate-700">{notice}</p> : null}
      <section aria-labelledby="privacy-history" className="space-y-3">
        <h2 id="privacy-history" className="text-lg font-black">Lịch sử yêu cầu</h2>
        {loading ? <p className="text-sm text-slate-500">Đang tải...</p> : null}
        {!loading && !items.length ? <p className="text-sm text-slate-500">Bạn chưa gửi yêu cầu nào.</p> : null}
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm">{statusText[item.status] ?? "Đang xử lý"}</strong>
              <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.message}</p>
            <p className="mt-2 text-xs text-slate-500">Mã yêu cầu: {item.id}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
