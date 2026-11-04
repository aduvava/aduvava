"use client";
import { useEffect, useState } from "react";
type Plan = { id: string; slug: string; name: string; description: string; price: number; interval: "MONTH" | "QUARTER" | "YEAR"; features: string[]; isActive: boolean };
const field = "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm";
export function PlanManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState("");
  const [form, setForm] = useState({ slug: "", name: "", description: "", price: 0, interval: "MONTH" as Plan["interval"], features: "", isActive: true });
  const [message, setMessage] = useState("");
  async function load() { const response = await fetch("/api/admin/plans"); if (response.ok) setPlans((await response.json()).items ?? []); else setMessage("Không tải được gói thành viên."); }
  useEffect(() => { void load(); }, []);
  function edit(plan: Plan) { setEditing(plan.id); setForm({ ...plan, features: Array.isArray(plan.features) ? plan.features.join("\n") : "" }); }
  async function save() {
    if (!form.slug.trim() || !form.name.trim() || form.price < 0) { setMessage("Điền tên, mã gói và giá hợp lệ."); return; }
    const response = await fetch(`/api/admin/plans${editing ? `/${editing}` : ""}`, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, price: Number(form.price), features: form.features.split("\n").map((value) => value.trim()).filter(Boolean) }) });
    const data = await response.json(); setMessage(response.ok ? "Đã lưu. Gói đang bật sẽ hiển thị tại /vip." : data.error ?? "Không lưu được gói."); if (response.ok) { setEditing(""); await load(); }
  }
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><section className="rounded-3xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">{editing ? "Sửa gói VIP" : "Tạo gói VIP"}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">
    <label className="text-sm font-bold">Mã gói<input className={field} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
    <label className="text-sm font-bold">Tên hiển thị<input className={field} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
    <label className="text-sm font-bold">Giá (đồng)<input className={field} type="number" min={0} value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} /></label>
    <label className="text-sm font-bold">Thời hạn<select className={field} value={form.interval} onChange={(event) => setForm({ ...form, interval: event.target.value as Plan["interval"] })}><option value="MONTH">1 tháng</option><option value="QUARTER">3 tháng</option><option value="YEAR">1 năm</option></select></label>
    <label className="text-sm font-bold sm:col-span-2">Mô tả<input className={field} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
    <label className="text-sm font-bold sm:col-span-2">Quyền lợi (mỗi dòng một mục)<textarea className={field} rows={6} value={form.features} onChange={(event) => setForm({ ...form, features: event.target.value })} /></label>
    <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Hiển thị trên website</label>
    </div><div className="mt-5 flex gap-3"><button onClick={() => void save()} className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white">Lưu gói</button>{editing && <button onClick={() => setEditing("")} className="rounded-xl bg-slate-100 px-5 py-3 font-bold">Tạo mới</button>}</div>{message && <p role="status" className="mt-3 text-sm">{message}</p>}</section>
    <section className="rounded-3xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Gói hiện có</h2><div className="mt-4 space-y-3">{plans.map((plan) => <div key={plan.id} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><div><strong>{plan.name}</strong><p className="text-sm text-slate-500">{plan.price.toLocaleString("vi-VN")}đ · {plan.isActive ? "Đang hiển thị" : "Đã ẩn"}</p></div><button onClick={() => edit(plan)} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">Sửa</button></div></div>)}</div></section></div>;
}
