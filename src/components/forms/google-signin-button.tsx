"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function GoogleSignInButton({
  enabled,
  callbackUrl = "/dashboard",
  label = "Tiếp tục với Google",
  selectAccount = false,
  role = "student",
}: {
  enabled: boolean;
  callbackUrl?: string;
  label?: string;
  selectAccount?: boolean;
  role?: "student" | "teacher";
}) {
  const [pending, setPending] = useState(false);

  async function handleGoogleLogin() {
    setPending(true);
    try {
      await signIn("google", {
        callbackUrl: "/auth/select-role?role=" + role + "&callbackUrl=" + encodeURIComponent(callbackUrl),
      }, selectAccount ? { prompt: "select_account" } : undefined);
    } catch {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={!enabled || pending}
        onClick={() => void handleGoogleLogin()}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-800 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden="true" className="text-lg font-black text-blue-600">G</span>
        {pending ? "Đang kết nối Google..." : label}
      </button>
      {!enabled ? (
        <p className="mt-2 text-center text-xs font-medium text-amber-700" role="note">
          Đăng nhập Google chưa được kích hoạt trên máy chủ này.
        </p>
      ) : null}
    </div>
  );
}
