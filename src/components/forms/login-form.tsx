"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

type LoginRole = "STUDENT" | "TEACHER" | "ADMIN";

function getSafeCallbackUrl(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

function getRole(searchRole: string | null): LoginRole {
  if (searchRole === "admin") return "ADMIN";
  if (searchRole === "teacher") return "TEACHER";
  return "STUDENT";
}

function getDestination(role: LoginRole) {
  if (role === "ADMIN") return "/admin";
  if (role === "TEACHER") return "/teacher";
  return "/onboarding";
}

function getRoleLabel(role: LoginRole) {
  if (role === "ADMIN") return "admin";
  if (role === "TEACHER") return "giáo viên";
  return "học sinh";
}

export function LoginForm() {
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const role = getRole(searchParams.get("role"));

  async function submit(formData: FormData) {
    setMessage("Đang đăng nhập...");
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      role,
      redirect: false,
    });

    const destination = getDestination(role);
    const callbackUrl = role === "STUDENT" ? destination : getSafeCallbackUrl(searchParams.get("callbackUrl"), destination);
    if (result?.ok) window.location.assign(callbackUrl);
    else setMessage(`Email, mật khẩu hoặc vai trò ${getRoleLabel(role)} không đúng.`);
  }

  return (
    <form action={submit} className="grid gap-4">
      <input name="email" type="email" required placeholder="Email" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
      <input name="password" type="password" required placeholder="Mật khẩu" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
      <button className="rounded-full bg-slate-900 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2" type="submit">
        Đăng nhập
      </button>
      {message ? <p role="status" className="text-sm font-semibold text-slate-700">{message}</p> : null}
    </form>
  );
}
