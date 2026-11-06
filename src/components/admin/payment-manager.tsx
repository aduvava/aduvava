"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Clock3, CreditCard, RefreshCw, Search, XCircle } from "lucide-react";

type SePayHealth = { apiKeyConfigured: boolean; receivingAccountConfigured: boolean; lastSuccessfulAutoPaymentAt: string | null };

type Payment = {
  id: string; amount: number; status: "PENDING" | "PAID" | "FAILED";
  reference: string; provider: string; createdAt: string; updatedAt: string;
  user?: { name?: string | null; email?: string | null };
  plan?: { name?: string; interval?: string };
};

const money = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount) + "đ";
const statusLabel: Record<Payment["status"], string> = { PENDING: "Chờ thanh toán", PAID: "Đã thanh toán", FAILED: "Thất bại" };

export function PaymentManager() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<"ALL" | Payment["status"]>("PENDING");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sepayHealth, setSepayHealth] = useState<SePayHealth | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/payments", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Không tải được thanh toán.");
      setPayments(body.items ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không tải được dữ liệu."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void fetch("/api/admin/payments/sepay-health", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data: SePayHealth | null) => setSepayHealth(data))
      .catch(() => { /* Status is advisory only; payment controls remain usable. */ });
  }, []);

  const visible = useMemo(() => payments.filter((payment) => {
    const hasStatus = filter === "ALL" || payment.status === filter;
    const needle = query.trim().toLowerCase();
    return hasStatus && (!needle || [payment.reference, payment.user?.email, payment.user?.name, payment.plan?.name].some((value) => String(value ?? "").toLowerCase().includes(needle)));
  }), [payments, filter, query]);

  const pending = payments.filter((payment) => payment.status === "PENDING");
  const paid = payments.filter((payment) => payment.status === "PAID");
  async function mark(payment: Payment, status: "PAID" | "FAILED") {
    if (payment.provider !== "manual-bank-transfer") {
      return setMessage("Giao dịch này không phải chuyển khoản thủ công; cần đối soát qua nhà cung cấp thanh toán.");
    }
    const prompt = status === "PAID"
      ? `Chỉ xác nhận khi bạn đã kiểm tra tiền THỰC NHẬN trong ứng dụng ngân hàng.\n\nMã giao dịch: ${payment.reference}\nSố tiền: ${money(payment.amount)}\nHọc viên: ${payment.user?.email ?? ""}\n\nXác nhận và kích hoạt VIP?`
      : `Đánh dấu giao dịch ${payment.reference} là thất bại?`;
    if (!window.confirm(prompt)) return;
    setBusyId(payment.id); setMessage("Đang đối soát...");
    try {
      const response = await fetch("/api/admin/payments/" + payment.id, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Không cập nhật được trạng thái.");
      await load();
      setMessage(status === "PAID" ? "Đã ghi nhận thanh toán và kích hoạt VIP qua giao dịch an toàn." : "Đã cập nhật trạng thái thất bại.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Cập nhật thất bại."); }
    finally { setBusyId(null); }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-orange-100 bg-orange-50/75 p-4 text-sm leading-6 text-slate-800">
        <p className="font-black text-slate-950">Tự động kích hoạt VIP qua SePay</p>
        <p>Hệ thống tự cấp quyền khi có tiền vào <strong>đúng tài khoản, đúng số tiền và đúng mã</strong>.
          Chỉ dùng nút “Đã nhận tiền” nếu bạn đã kiểm tra giao dịch thật trong ứng dụng ngân hàng.</p>
        {sepayHealth ? (
          <div className="mt-2 space-y-1 text-xs font-semibold">
            <p>Khóa xác thực webhook trên server: {sepayHealth.apiKeyConfigured ? "Đã cấu hình" : "Chưa cấu hình"}</p>
            <p>Tài khoản nhận tiền trên server: {sepayHealth.receivingAccountConfigured ? "Đã cấu hình" : "Chưa cấu hình"}</p>
            <p>Lần cuối tự kích hoạt VIP từ SePay: {sepayHealth.lastSuccessfulAutoPaymentAt
              ? new Date(sepayHealth.lastSuccessfulAutoPaymentAt).toLocaleString("vi-VN")
              : "Chưa ghi nhận thành công"}</p>
            <p className="font-normal">Lưu ý: Có cấu hình trên server không chứng minh webhook đã bật trong tài khoản SePay. Hãy kiểm tra Delivery logs trong SePay.</p>
          </div>
        ) : <p className="mt-2 text-xs text-slate-500">Đang kiểm tra cấu hình trên máy chủ...</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-orange-100 bg-white p-4"><p className="text-sm font-bold text-slate-500">Chờ đối soát</p><p className="mt-1 text-3xl font-black text-orange-500">{pending.length}</p></div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-4"><p className="text-sm font-bold text-slate-500">Đã thanh toán</p><p className="mt-1 text-3xl font-black text-emerald-600">{paid.length}</p></div>
        <div className="col-span-2 rounded-2xl border border-slate-100 bg-white p-4 sm:col-span-1"><p className="text-sm font-bold text-slate-500">Tổng giao dịch</p><p className="mt-1 text-3xl font-black text-slate-950">{payments.length}</p></div>
      </div>
      <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-xl font-black text-slate-950">Danh sách thanh toán</h2>
            <p className="mt-1 text-sm text-slate-500">Trạng thái PENDING là yêu cầu chờ nhận tiền, không phải đã thanh toán. Chỉ duyệt khi giao dịch ngân hàng thực tế khớp mã và số tiền.</p></div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-orange-600"><RefreshCw className="h-4 w-4" /> Tải lại</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_200px]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 text-slate-400" /><input className="min-h-11 min-w-0 w-full bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm email, mã giao dịch, gói..." /></label>
          <select className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
            <option value="ALL">Tất cả</option><option value="PENDING">Chờ thanh toán</option><option value="PAID">Đã thanh toán</option><option value="FAILED">Thất bại</option>
          </select>
        </div>
        {message ? <p role="status" className="mt-4 rounded-xl bg-orange-50 p-3 text-sm font-semibold text-orange-800">{message}</p> : null}
        <div className="mt-5 space-y-3">
          {visible.map((payment) => (
            <article key={payment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-black text-slate-950">{money(payment.amount)}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${payment.status === "PAID" ? "bg-emerald-100 text-emerald-700" : payment.status === "PENDING" ? "bg-orange-100 text-orange-700" : "bg-rose-100 text-rose-700"}`}>
                      {payment.status === "PAID" ? <BadgeCheck className="h-3.5 w-3.5" /> : payment.status === "PENDING" ? <Clock3 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {statusLabel[payment.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-800">{payment.user?.name || payment.user?.email || "Học viên"} · {payment.plan?.name || "Gói chưa xác định"}</p>
                  <p className="mt-1 break-all text-xs font-bold text-slate-500">Email: {payment.user?.email ?? "—"}</p>
                  <p className="mt-1 break-all text-xs font-mono text-slate-600">Mã chuyển khoản: {payment.reference}</p>
                  <p className="mt-1 text-xs text-slate-500">Tạo lúc {new Date(payment.createdAt).toLocaleString("vi-VN")} · {payment.provider}</p>
                </div>
                {payment.status !== "PAID" && payment.provider === "manual-bank-transfer" ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={Boolean(busyId)} onClick={() => void mark(payment, "PAID")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-40">
                      <BadgeCheck className="h-4 w-4" /> Đã nhận tiền
                    </button>
                    {payment.status === "PENDING" ? <button type="button" disabled={Boolean(busyId)} onClick={() => void mark(payment, "FAILED")} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-40">Thất bại</button> : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {!visible.length ? <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">Không tìm thấy giao dịch phù hợp.</p> : null}
        </div>
      </div>
    </div>
  );
}
