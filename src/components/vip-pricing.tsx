"use client";

import { useState } from "react";
import { Check, Crown, Landmark, X } from "lucide-react";
import { clsx } from "clsx";

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  features: string[];
};

type VipPricingProps = {
  plans: Plan[];
  activeSubscription: { planName: string; endsAt: string } | null;
};

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function durationLabel(plan: Plan) {
  if (plan.slug.includes("quarter") || plan.interval === "QUARTER") return "3 tháng";
  if (plan.interval === "YEAR") return "1 năm";
  return "1 tháng";
}

function PlanCard({ plan, featured }: { plan: Plan; featured: boolean }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  async function checkout() {
    setLoading(true);
    setMessage("Đang tạo yêu cầu thanh toán...");
    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id }),
    });

    if (response.status === 401) {
      window.location.href = "/login?callbackUrl=/vip";
      return;
    }

    const data = await response.json();
    setLoading(false);
    setPaymentOpen(false);
    setMessage(response.ok ? `Mã thanh toán: ${data.manualTransferCode}. Admin sẽ kích hoạt VIP sau khi xác nhận.` : data.error ?? "Không tạo được yêu cầu thanh toán.");
  }

  return (
    <article className={clsx("relative flex min-h-full flex-col overflow-hidden rounded-[2rem] border bg-white shadow-[0_18px_45px_rgba(15,23,42,.08)]", featured ? "border-orange-300 ring-4 ring-orange-100" : "border-orange-100")}>
      {featured ? <Crown className="absolute right-6 top-5 h-7 w-7 fill-amber-300 text-amber-300" /> : null}
      <div className={clsx("border-b p-6 sm:p-7", featured ? "bg-orange-50/80" : "bg-slate-50")}>
        <p className={clsx("text-lg font-black", featured ? "text-orange-700" : "text-slate-700")}>{plan.name}</p>
        <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
          <span className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{formatVnd(plan.price)}</span>
          <span className="pb-2 text-lg font-semibold text-slate-600">/ {durationLabel(plan)}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex-1 space-y-3">
          {plan.features.map((feature, index) => (
            <p key={`${feature}-${index}`} className="flex gap-3 text-sm font-semibold leading-6 text-slate-600">
              <Check className="mt-1 h-4 w-4 shrink-0 text-orange-600" />
              <span>{feature}</span>
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setMessage("");
            setPaymentOpen(true);
          }}
          className={clsx("mt-6 w-full rounded-2xl px-6 py-3.5 text-base font-black transition", featured ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-slate-950 text-white hover:bg-orange-500")}
        >
          Đăng ký ngay
        </button>
        {message ? <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{message}</p> : null}
      </div>

      {paymentOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={() => setPaymentOpen(false)}>
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">Thanh toán VIP Ava</p>
                <h3 className="mt-2 text-3xl font-black text-slate-950">{plan.name}</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Chọn phương thức thanh toán cho {formatVnd(plan.price)} / {durationLabel(plan)}.
                </p>
              </div>
              <button type="button" onClick={() => setPaymentOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-500 text-white"><Landmark className="h-5 w-5" /></span>
              <p className="text-sm font-semibold leading-6 text-slate-600">
                Hệ thống sẽ tạo mã giao dịch thật ở trạng thái chờ. Dùng mã này làm nội dung chuyển khoản để Admin đối soát và kích hoạt gói.
              </p>
            </div>

            <button type="button" onClick={checkout} disabled={loading} className="mt-6 w-full rounded-2xl bg-orange-500 px-6 py-4 text-base font-black text-white transition hover:bg-orange-600 disabled:bg-slate-300">
              {loading ? "Đang xác nhận..." : "Xác nhận thanh toán"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function VipPricing({ plans, activeSubscription }: VipPricingProps) {
  const featured = plans.find((plan) => plan.slug.includes("monthly"))?.id ?? plans[1]?.id;

  return (
    <main className="min-h-screen bg-[#fffdf7] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1320px]">
        <section className="overflow-hidden rounded-[3rem] bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500 p-7 text-white shadow-xl shadow-orange-100 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-100">Nạp VIP Ava</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-3xl font-black leading-tight sm:text-5xl">Mở khóa trọn bộ đề thi và nội dung nâng cao</h1>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-orange-50">
                Chọn gói VIP để luyện đề từ lớp 6-12, ôn thi vào 10, THPTQG và xem lý thuyết nâng cao do Admin xuất bản.
              </p>
            </div>
            {activeSubscription ? (
              <div className="rounded-[2rem] bg-white/15 p-4 text-sm font-bold backdrop-blur">
                Đang dùng {activeSubscription.planName}
                <br />
                đến {new Date(activeSubscription.endsAt).toLocaleDateString("vi-VN")}
              </div>
            ) : (
              <div className="rounded-[2rem] bg-white/15 p-4 text-sm font-bold backdrop-blur">
                Chưa có VIP. Chọn gói bên dưới để bắt đầu.
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => <PlanCard key={plan.id} plan={plan} featured={plan.id === featured} />)}
          {!plans.length ? (
            <div className="rounded-[2rem] border border-orange-100 bg-white p-10 text-center text-sm font-semibold text-slate-500 lg:col-span-3">
              Chưa có gói VIP. Admin có thể tạo gói mới trong mục Gói thành viên.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
