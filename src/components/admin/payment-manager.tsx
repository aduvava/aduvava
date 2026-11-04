"use client";
import { useEffect, useState } from "react";
type Payment = { id: string; amount: number; status: "PENDING" | "PAID" | "FAILED"; reference: string; provider: string; createdAt: string; user: { email: string; name?: string }; plan: { name: string } };
export function PaymentManager() {
  const [items, setItems] = useState<Payment[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  async function load() { const response = await fetch("/api/admin/payments"); if (response.ok) setItems((await response.json()).items ?? []); else setMessage("Không tải được giao dịch."); }
  useEffect(() => { void load(); }, []);
  async function update(item: Payment, status: "PAID" | "FAILED") {
    if (status === "PAID" && !window.confirm(`Đã kiểm tra tiền vào tài khoản?\nMã: ${item.reference}\nSố tiền: ${item.amount.toLocaleString("vi-VN")}đ\nNgười dùng: ${item.user.email}\nChỉ xác nhận khi ngân hàng đã báo nhận đủ tiền.`)) return;
    setBusy(item.id);
    const response = await fetch(`/api/admin/payments/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await response.json(); setMessage(response.ok ? "Đã cập nhật giao dịch và quyền VIP tương ứng." : data.error ?? "Không thể cập nhật giao dịch."); setBusy(""); if (response.ok) await load();
  }
  return <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">Đối soát chuyển khoản</h2><select className="rounded-xl border px-3 py-2 text-sm" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="PENDING">Chờ đối soát</option><option value="PAID">Đã thanh toán</option><option value="FAILED">Thất bại</option><option value="ALL">Tất cả</option></select></div><p className="mt-2 text-sm text-slate-500">So khớp mã, số tiền và người chuyển trong sao kê ngân hàng trước khi kích hoạt VIP.</p>{message && <p role="status" className="mt-4 text-sm font-semibold">{message}</p>}<div className="mt-5 space-y-3">{items.filter((item) => filter === "ALL" || item.status === filter).map((item) => <div key={item.id} className="rounded-2xl border p-4 text-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{item.plan?.name} · {item.amount.toLocaleString("vi-VN")}đ</strong><p>{item.user?.name || item.user?.email} · {item.user?.email}</p><p className="font-mono text-xs">{item.reference}</p><p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("vi-VN")} · {item.status}</p></div>{item.status === "PENDING" && <div className="flex gap-2"><button disabled={busy === item.id} onClick={() => void update(item, "PAID")} className="rounded-xl bg-emerald-600 px-3 py-2 font-bold text-white disabled:opacity-50">Đã nhận tiền</button><button disabled={busy === item.id} onClick={() => void update(item, "FAILED")} className="rounded-xl bg-slate-100 px-3 py-2 font-bold disabled:opacity-50">Thất bại</button></div>}</div></div>)}{!items.some((item) => filter === "ALL" || item.status === filter) && <p className="text-sm text-slate-500">Chưa có giao dịch ở trạng thái này.</p>}</div></section>;
}
