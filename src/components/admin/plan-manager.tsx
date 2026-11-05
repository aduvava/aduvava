"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, RefreshCw, ShieldCheck } from "lucide-react";

type Plan = {
  id: string; slug: string; name: string; description: string; price: number;
  interval: "MONTH" | "QUARTER" | "YEAR"; features: unknown; isActive: boolean;
};

function vnd(amount: number) { return new Intl.NumberFormat("vi-VN").format(amount) + "đ"; }
const field = "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const label = "grid gap-1.5 text-sm font-bold text-slate-700";
const intervalNames: Record<Plan["interval"], string> = { MONTH: "1 tháng", QUARTER: "3 tháng", YEAR: "12 tháng" };
const slugify = (input: string) => input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function PlanManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const [price, setPrice] = useState("99000"); const [interval, setInterval] = useState<Plan["interval"]>("MONTH");
  const [features, setFeatures] = useState("Truy cập đề thi VIP\nXem lời giải và bài lý thuyết nâng cao");
  const [isActive, setIsActive] = useState(true); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/plans", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không tải được gói.");
      setPlans(data.items ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không tải được dữ liệu."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function reset() {
    setEditing(null); setName(""); setDescription(""); setPrice("99000");
    setInterval("MONTH"); setFeatures("Truy cập đề thi VIP\nXem lời giải và bài lý thuyết nâng cao"); setIsActive(true);
  }
  function edit(plan: Plan) {
    setEditing(plan); setName(plan.name); setDescription(plan.description); setPrice(String(plan.price));
    setInterval(plan.interval);
    setFeatures(Array.isArray(plan.features) ? plan.features.map(String).join("\n") : "");
    setIsActive(plan.isActive); setMessage("Đang chỉnh sửa gói " + plan.name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(price);
    if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 1000000000) return setMessage("Giá bán phải là số nguyên từ 1.000đ đến 1 tỷ đồng.");
    const benefitList = features.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!name.trim() || !benefitList.length) return setMessage("Hãy nhập tên và ít nhất một quyền lợi.");
    setBusy(true); setMessage("Đang lưu gói...");
    try {
      const payload = {
        name: name.trim(), description: description.trim(), price: amount, interval,
        features: benefitList, isActive,
        ...(editing ? {} : { slug: slugify(name) + "-" + interval.toLowerCase() + "-" + Date.now().toString(36) }),
      };
      const response = await fetch(editing ? "/api/admin/plans/" + editing.id : "/api/admin/plans", {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Không lưu được gói. Hãy kiểm tra thông tin hoặc tên gói trùng.");
      await load();
      setMessage(editing ? "Đã cập nhật gói. Các gói cũ của học viên vẫn được giữ." : "Đã tạo gói thành viên mới.");
      reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được gói."); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.9fr)_minmax(350px,1.1fr)]">
      <section className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">{editing ? "Sửa gói thành viên" : "Thêm gói thành viên"}</h2>
          {editing ? <button className="text-sm font-bold text-orange-600" type="button" onClick={reset}>+ Tạo gói mới</button> : null}
        </div>
        <p className="mt-2 text-sm text-slate-500">Thay đổi tên gói, giá và quyền lợi trực tiếp. Không cần dùng mã JSON.</p>
        <form onSubmit={submit} className="mt-5 grid gap-4">
          <label className={label}>Tên gói<input className={field} value={name} maxLength={200} required onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Educhi VIP 1 tháng" /></label>
          <label className={label}>Mô tả<textarea className={field} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Giới thiệu gói học..." /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Giá bán (VNĐ)<input className={field} type="number" min={1000} max={1000000000} step={1000} required value={price} onChange={(event) => setPrice(event.target.value)} /></label>
            <label className={label}>Thời hạn<select className={field} value={interval} onChange={(event) => setInterval(event.target.value as Plan["interval"])}>
              <option value="MONTH">1 tháng</option><option value="QUARTER">3 tháng</option><option value="YEAR">12 tháng</option>
            </select></label>
          </div>
          <label className={label}>Quyền lợi (mỗi dòng một quyền lợi)
            <textarea className={field} value={features} rows={6} onChange={(event) => setFeatures(event.target.value)} placeholder="Luyện đề VIP\nTruy cập lý thuyết nâng cao" />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> Mở bán gói này</label>
          <button type="submit" disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50">
            <Plus className="h-4 w-4" /> {busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo gói thành viên"}
          </button>
        </form>
        {message ? <p role="status" className="mt-4 rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-800">{message}</p> : null}
      </section>
      <section className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black text-slate-950">Các gói đang quản lý ({plans.length})</h2>
          <button type="button" onClick={() => void load()} aria-label="Tải lại" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 space-y-3">
          {plans.map((plan) => (
            <article key={plan.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-lg font-black text-slate-950">{plan.name}</p><p className="mt-1 text-2xl font-black text-orange-500">{vnd(plan.price)} <span className="text-xs text-slate-500">/ {intervalNames[plan.interval]}</span></p></div>
                <button type="button" onClick={() => edit(plan)} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-600 shadow-sm hover:bg-blue-50"><Pencil className="h-4 w-4" /> Sửa</button>
              </div>
              <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
              <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${plan.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                <ShieldCheck className="h-3.5 w-3.5" /> {plan.isActive ? "Đang mở bán" : "Đã ẩn khỏi trang VIP"}
              </p>
              <div className="mt-3 space-y-2">
                {(Array.isArray(plan.features) ? plan.features : []).map((benefit, index) => (
                  <p key={index} className="flex gap-2 text-xs font-semibold text-slate-600"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> {String(benefit)}</p>
                ))}
              </div>
            </article>
          ))}
          {!plans.length ? <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">Chưa có gói. Hãy tạo gói đầu tiên ở biểu mẫu bên cạnh.</p> : null}
        </div>
      </section>
    </div>
  );
}
