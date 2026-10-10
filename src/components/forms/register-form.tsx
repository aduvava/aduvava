"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { SCHOOL_GRADES, VIETNAM_PROVINCES } from "@/data/profile-options";

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
        <select name="grade" required defaultValue="" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100">
          <option value="" disabled>Chọn lớp</option>
          {SCHOOL_GRADES.map((grade) => <option key={grade} value={grade}>Lớp {grade}</option>)}
        </select>
        <select name="province" required defaultValue="" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100">
          <option value="" disabled>Chọn tỉnh/thành</option>
          {VIETNAM_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
        </select>
      </div>
      <button className="min-h-12 w-full rounded-full px-5 py-3 font-extrabold text-white shadow-md transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2" style={{ backgroundColor: "#f97316", color: "#ffffff", visibility: "visible", opacity: 1 }} type="submit">TẠO TÀI KHOẢN</button>
      {message ? <p className="text-sm font-semibold text-ink/65">{message}</p> : null}
    </form>
  );
}
