"use client";

import { useState } from "react";
import { Check, Copy, Crown, QrCode, X } from "lucide-react";
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

type BankTransferDetails = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  transferContent: string;
  qrUrl: string;
};

function DetailRow({ label, value, onCopy }: { label: string; value: string; onCopy: (text: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-1 break-all text-sm font-extrabold text-slate-950 sm:text-base">{value}</p>
      </div>
      <button type="button" onClick={() => onCopy(value)}
        aria-label={"Sao chép " + label}
        className="shrink-0 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100">
        <Copy className="mr-1 inline h-3.5 w-3.5" /> Sao chép
      </button>
    </div>
  );
}

function PlanCard({ plan, featured }: { plan: Plan; featured: boolean }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [bankTransfer, setBankTransfer] = useState<BankTransferDetails | null>(null);
  const [qrFailed, setQrFailed] = useState(false);

  async function checkout() {
    if (loading) return;
    if (bankTransfer) { setPaymentOpen(true); return; }
    setLoading(true);
    setMessage("");
    try {
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
      if (!response.ok || !data.bankTransfer) {
        setMessage(data.error ?? "Không thể tạo thông tin chuyển khoản. Vui lòng thử lại.");
        return;
      }
      setBankTransfer(data.bankTransfer);
      setQrFailed(false);
      setPaymentOpen(true);
    } catch {
      setMessage("Không thể kết nối máy chủ thanh toán. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Đã sao chép thông tin chuyển khoản.");
    } catch {
      setMessage("Không thể sao chép tự động. Vui lòng chọn và sao chép thủ công.");
    }
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
        <button type="button" onClick={() => void checkout()} disabled={loading}
          className={clsx("mt-6 w-full rounded-2xl px-6 py-3.5 text-base font-black transition disabled:opacity-60", featured ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-slate-950 text-white hover:bg-orange-500")}>
          {loading ? "Đang tạo mã chuyển khoản..." : bankTransfer ? "Xem lại mã QR chuyển khoản" : "Đăng ký ngay"}
        </button>
        {bankTransfer ? (
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
            Chuyển khoản {formatVnd(bankTransfer.amount)} đến {bankTransfer.bankName} • {bankTransfer.accountNumber}.
            <button type="button" onClick={() => setPaymentOpen(true)} className="ml-1 text-orange-700 underline">
              Xem mã QR và nội dung
            </button>
          </p>
        ) : null}
        {message ? <p role="status" className="mt-3 text-xs font-semibold leading-5 text-slate-600">{message}</p> : null}
      </div>

      {paymentOpen && bankTransfer ? (
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setPaymentOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label="Thông tin chuyển khoản VIP Educhi"
            className="my-auto max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-[1.7rem] bg-white p-4 shadow-2xl sm:rounded-[2rem] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Chuyển khoản VIP Educhi</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">Thông tin thanh toán</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{plan.name} · {formatVnd(bankTransfer.amount)}</p>
              </div>
              <button type="button" onClick={() => setPaymentOpen(false)}
                aria-label="Đóng thông tin chuyển khoản"
                className="shrink-0 rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-orange-100 bg-orange-50/60 p-4 text-center">
                <p className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
                  <QrCode className="h-5 w-5 text-orange-600" /> Quét mã VietQR
                </p>
                {qrFailed ? (
                  <p role="status" className="rounded-xl border bg-white p-4 text-sm text-slate-600">
                    Không tải được ảnh QR. Hãy dùng thông tin chuyển khoản bên cạnh.
                  </p>
                ) : (
                  <img src={bankTransfer.qrUrl} alt={"Mã VietQR nhận " + formatVnd(bankTransfer.amount)}
                    width={270} height={320} referrerPolicy="no-referrer"
                    onError={() => setQrFailed(true)}
                    className="h-auto max-h-[300px] w-full max-w-[254px] rounded-xl bg-white object-contain" />
                )}
                <p className="mt-3 text-xs font-semibold text-slate-600">
                  Mở ứng dụng ngân hàng để quét và kiểm tra tên người nhận.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-1 sm:px-5">
                <DetailRow label="Ngân hàng" value={bankTransfer.bankName} onCopy={(value) => void copyValue(value)} />
                <DetailRow label="Số tài khoản" value={bankTransfer.accountNumber} onCopy={(value) => void copyValue(value)} />
                <DetailRow label="Tên chủ tài khoản" value={bankTransfer.accountName} onCopy={(value) => void copyValue(value)} />
                <DetailRow label="Số tiền" value={formatVnd(bankTransfer.amount)} onCopy={() => void copyValue(String(bankTransfer.amount))} />
                <DetailRow label="Nội dung chuyển khoản (giữ nguyên)" value={bankTransfer.transferContent} onCopy={(value) => void copyValue(value)} />
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950">
              Vui lòng chuyển đúng số tiền và giữ nguyên nội dung chuyển khoản.
              Chỉ thanh toán khi tên người nhận trong ứng dụng ngân hàng khớp với thông tin đã xác minh.
              Gói VIP chỉ kích hoạt sau khi hệ thống đối soát nhận được tiền, không phải sau khi bấm nút.
            </div>
            {message ? <p role="status" className="mt-3 text-sm font-semibold text-slate-600">{message}</p> : null}
            <button type="button" onClick={() => setPaymentOpen(false)}
              className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 font-black text-white hover:bg-orange-600">
              Đã hiểu — Đóng
            </button>
          </section>
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
          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-100">Nạp VIP Educhi</p>
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
