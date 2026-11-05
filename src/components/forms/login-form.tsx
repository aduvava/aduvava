"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { GoogleSignInButton } from "@/components/forms/google-signin-button";
import { safePostLoginPath } from "@/lib/onboarding";

type LoginRole = "STUDENT" | "TEACHER" | "ADMIN";

function getRole(searchRole: string | null): LoginRole {
  if (searchRole === "admin") return "ADMIN";
  if (searchRole === "teacher") return "TEACHER";
  return "STUDENT";
}

function getDestination(role: LoginRole) {
  if (role === "ADMIN") return "/admin";
  if (role === "TEACHER") return "/teacher";
  return "/dashboard";
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const role = getRole(searchParams.get("role"));
  const destination = safePostLoginPath(searchParams.get("callbackUrl"), getDestination(role));

  async function submit(formData: FormData) {
    setMessage("Đang đăng nhập...");
    try {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        role,
        redirect: false,
      });
      if (result?.ok) {
        window.location.assign("/auth/continue?role=" + role.toLowerCase() + "&callbackUrl=" + encodeURIComponent(destination));
      } else {
        setMessage("Email hoặc mật khẩu không đúng. Hãy kiểm tra và thử lại.");
      }
    } catch {
      setMessage("Không kết nối được máy chủ. Vui lòng thử lại.");
    }
  }

  return (
    <div className="grid gap-4">
      {searchParams.get("error") ? (
        <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          Chưa đăng nhập được. Hãy thử lại bằng Google hoặc email/mật khẩu.
        </p>
      ) : null}
      <form action={submit} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          Email
          <input name="email" type="email" autoComplete="email" required placeholder="Nhập email của bạn" className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          Mật khẩu
          <input name="password" type="password" autoComplete="current-password" required placeholder="Nhập mật khẩu" className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
        </label>
        <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 font-extrabold text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2">
          ĐĂNG NHẬP
        </button>
        {message ? <p role="status" className="text-sm font-semibold text-slate-700">{message}</p> : null}
      </form>
      {role !== "ADMIN" ? (
        <>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> hoặc đăng nhập nhanh <span className="h-px flex-1 bg-slate-200" />
          </div>
          <GoogleSignInButton
            enabled={googleEnabled}
            callbackUrl={destination}
            role={role === "TEACHER" ? "teacher" : "student"}
            label="Tiếp tục bằng Google"
          />
          <p className="text-center text-xs leading-5 text-slate-500">
            Một tài khoản dùng được cho cả học sinh và giáo viên. Bạn có thể đổi vai trò sau khi đăng nhập.
          </p>
        </>
      ) : null}
    </div>
  );
}
