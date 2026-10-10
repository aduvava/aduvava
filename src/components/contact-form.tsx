"use client";

import { useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setStatus("Đang gửi...");
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        message: formData.get("message"),
        source: "service-page"
      })
    });
    setStatus(response.ok ? "Đã nhận thông tin. Admin sẽ xử lý lead trong dashboard." : "Gửi thất bại. Kiểm tra lại thông tin.");
  }

  return (
    <form action={submit} className="grid gap-3">
      <input name="name" required placeholder="Họ tên" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      <input name="email" required type="email" placeholder="Email" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      <input name="phone" placeholder="Số điện thoại" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      <textarea name="message" required minLength={10} placeholder="Nhu cầu học tập" className="min-h-32 rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      <button className="rounded-full bg-clay px-5 py-3 font-bold text-white" type="submit">Gửi tư vấn</button>
      {status ? <p className="text-sm font-semibold text-ink/70">{status}</p> : null}
    </form>
  );
}
