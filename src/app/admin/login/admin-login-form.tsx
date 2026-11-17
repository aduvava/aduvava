"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

function getSafeCallbackUrl(value: string, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function AdminLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setMessage("Đang đăng nhập...");
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      role: "ADMIN",
      redirect: false,
    });

    if (result?.ok) window.location.assign(getSafeCallbackUrl(callbackUrl, "/admin"));
    else setMessage("Email, mật khẩu hoặc quyền admin không đúng.");
  }

  async function signInWithGoogle() {
    setMessage("Đang chuyển đến Google...");
    await signIn("google", {
      callbackUrl: getSafeCallbackUrl(callbackUrl, "/admin"),
    });
  }

  return (
    <form action={submit} className="grid gap-4">
      <input
        name="email"
        type="email"
        required
        placeholder="Email admin"
        className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-orange-400"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Mật khẩu"
        className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-orange-400"
      />
      <button className="rounded-full bg-orange-500 px-5 py-3 font-black text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-600" type="submit">
        Đăng nhập admin
      </button>
      <div className="flex items-center gap-3 text-xs font-semibold text-white/40">
        <span className="h-px flex-1 bg-white/15" />
        HOẶC
        <span className="h-px flex-1 bg-white/15" />
      </div>
      <button
        className="flex items-center justify-center gap-3 rounded-full border border-white/15 bg-white px-5 py-3 font-black text-slate-800 transition hover:bg-slate-100"
        type="button"
        onClick={() => void signInWithGoogle()}
      >
        <span aria-hidden="true" className="text-xl font-black text-[#4285f4]">G</span>
        Đăng nhập bằng Google
      </button>
      {message ? <p className="text-sm font-semibold text-orange-100">{message}</p> : null}
    </form>
  );
}
