"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export function RegisterForm() {
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "teacher" ? "TEACHER" : "STUDENT";

  async function submit(formData: FormData) {
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      grade: formData.get("grade"),
      province: formData.get("province"),
      role
    };
    setMessage("Đang tạo tài khoản...");
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "Không tạo được tài khoản.");
      return;
    }
    await signIn("credentials", { email: payload.email, password: payload.password, role, redirect: false });
    window.location.assign(role === "TEACHER" ? "/teacher" : "/onboarding");
  }

  return (
    <form action={submit} className="grid gap-4">
      <input name="name" required placeholder="Họ tên" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      <input name="email" type="email" required placeholder="Email" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      <input name="password" type="password" required minLength={6} placeholder="Mật khẩu" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      <div className="grid gap-3 md:grid-cols-2">
        <input name="grade" placeholder="Lớp" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
        <input name="province" placeholder="Tỉnh/thành" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      </div>
      <button className="rounded-full bg-clay px-5 py-3 font-bold text-white" type="submit">Tạo tài khoản</button>
      {message ? <p className="text-sm font-semibold text-ink/65">{message}</p> : null}
    </form>
  );
}
