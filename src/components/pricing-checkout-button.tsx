"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PricingCheckoutButton({ planId }: { planId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function checkout() {
    setMessage("Đang tạo yêu cầu thanh toán mock...");
    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId })
    });

    if (response.status === 401) {
      router.push("/login?callbackUrl=/dich-vu");
      return;
    }

    const data = await response.json();
    setMessage(response.ok ? `Mã chuyển khoản mock: ${data.manualTransferCode}. Admin cần kích hoạt subscription thủ công.` : data.error ?? "Không tạo được thanh toán.");
  }

  return (
    <div className="space-y-3">
      <button onClick={checkout} className="w-full rounded-full bg-ink px-5 py-3 font-bold text-white transition hover:bg-moss">
        Chọn gói
      </button>
      {message ? <p className="text-sm font-semibold text-ink/65">{message}</p> : null}
    </div>
  );
}
