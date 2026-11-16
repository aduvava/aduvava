"use client";

import { useState } from "react";
import { Check, Copy, Gift, Share2, Users } from "lucide-react";

export type ReferralOverview = {
  code: string;
  balanceVnd: number;
  totalRewardedPurchases: number;
  vipBuyersCount: number;
  history: Array<{ id: string; paymentAmountVnd: number; amountVnd: number; createdAt: string }>;
};

const money = (amount: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
}).format(amount);

export function ReferralWidget({ overview }: { overview: ReferralOverview }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [notice, setNotice] = useState("");
  const url = "https://educhi.xyz/r/" + overview.code;

  async function copy(text: string, type: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setNotice(type === "code" ? "Đã sao chép mã giới thiệu." : "Đã sao chép link giới thiệu.");
    } catch {
      setNotice("Không tự sao chép được. Hãy chọn mã hoặc link bên dưới để sao chép thủ công.");
    }
  }

  async function shareLink() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Mời bạn nhận VIP cùng Educhi", text: "Nhập mã giới thiệu " + overview.code + " khi mua VIP Educhi nhé!", url });
      } catch { /* User cancelled the native share dialog. */ }
    } else {
      await copy(url, "link");
    }
  }

  return (
    <section aria-labelledby="referral-title" className="mt-8 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-orange-600"><Gift className="h-4 w-4" /> Chương trình giới thiệu</span>
          <h2 id="referral-title" className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl">Mời bạn bè — Nhận thưởng 10%</h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            Gửi mã 6 ký tự cho bạn bè. Bất kỳ tài khoản Educhi nào nhập mã của bạn khi mua VIP và thanh toán thành công đều giúp bạn nhận 10% số tiền thực trả vào số dư thưởng nội bộ. Nhập mã hoàn toàn không bắt buộc.
          </p>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50 px-5 py-3">
          <p className="text-xs font-bold text-slate-500">Số dư thưởng đã ghi nhận</p>
          <p className="mt-1 text-2xl font-black text-orange-600">{money(overview.balanceVnd)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label htmlFor="my-vip-referral-code" className="grid gap-1.5 text-xs font-bold text-slate-500">
          Mã giới thiệu riêng của bạn — 6 ký tự
          <input id="my-vip-referral-code" value={overview.code} readOnly onFocus={(event) => event.currentTarget.select()} className="min-h-12 w-full min-w-0 rounded-xl border border-orange-100 bg-orange-50/40 px-4 text-xl font-black uppercase tracking-[.2em] text-slate-900 focus:outline-orange-500" />
        </label>
        <button type="button" onClick={() => void copy(overview.code, "code")} className="inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600">
          {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied === "code" ? "Đã sao chép" : "Sao chép mã"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label htmlFor="my-vip-referral-link" className="grid min-w-0 gap-1.5 text-xs font-bold text-slate-500">
          Hoặc gửi link đưa bạn bè đến trang mua VIP
          <input id="my-vip-referral-link" value={url} readOnly onFocus={(event) => event.currentTarget.select()} className="min-h-12 w-full min-w-0 rounded-xl border border-orange-100 bg-orange-50/40 px-4 text-sm font-semibold text-slate-700 focus:outline-orange-500" />
        </label>
        <button type="button" onClick={() => void copy(url, "link")} className="inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-xl border border-orange-200 px-5 py-3 text-sm font-black text-orange-700 hover:bg-orange-50">
          {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Sao chép link
        </button>
        <button type="button" onClick={() => void shareLink()} className="inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-xl border border-orange-200 px-5 py-3 text-sm font-black text-orange-700 hover:bg-orange-50">
          <Share2 className="h-4 w-4" /> Chia sẻ
        </button>
      </div>
      {notice ? <p role="status" className="mt-2 text-xs font-medium text-slate-600">{notice}</p> : null}

      <div className="mt-5 grid grid-cols-2 gap-3 md:max-w-xl">
        <div className="rounded-xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-xs font-bold text-slate-500"><Users className="h-4 w-4" /> Lượt VIP có thưởng</p><p className="mt-1 text-xl font-black">{overview.totalRewardedPurchases}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Người mua VIP qua mã</p><p className="mt-1 text-xl font-black">{overview.vipBuyersCount}</p></div>
      </div>
      {overview.history.length ? (
        <div className="mt-6">
          <h3 className="text-sm font-black text-slate-900">Lịch sử thưởng gần đây</h3>
          <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
            {overview.history.map((reward) => (
              <div key={reward.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-slate-600">VIP {money(reward.paymentAmountVnd)} · {new Date(reward.createdAt).toLocaleDateString("vi-VN")}</span>
                <span className="font-black text-emerald-700">+{money(reward.amountVnd)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : <p className="mt-5 text-xs font-medium text-slate-500">Bạn chưa có hoa hồng. Chia sẻ mã để bắt đầu.</p>}
      <p className="mt-5 text-xs leading-5 text-slate-500">
        Mỗi đơn VIP chỉ áp dụng một mã, không thể tự giới thiệu. Thưởng chỉ ghi nhận khi giao dịch được xác nhận; giao dịch đang chờ hoặc thất bại không được tính. Số dư này là khoản thưởng nội bộ, chưa hỗ trợ rút tiền hoặc quy đổi.
      </p>
    </section>
  );
}
