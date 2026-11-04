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

function getRoleLabel(role: LoginRole) {
  if (role === "ADMIN") return "admin";
  if (role === "TEACHER") return "giáo viên";
  return "học sinh";
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const role = getRole(searchParams.get("role"));

  async function submit(formData: FormData) {
    setMessage("Đang đăng nhập...");
    const linkingExistingAccount = searchParams.get("error") === "OAuthAccountNotLinked";
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      // During linking, verify the original credentials without rejecting
      // existing accounts that have since become teachers or admins.
      ...(linkingExistingAccount ? {} : { role }),
      redirect: false,
    });

    const destination = getDestination(role);
    const callbackUrl = safePostLoginPath(searchParams.get("callbackUrl"), destination);
    if (result?.ok) {
      if (linkingExistingAccount) {
        window.location.assign("/account/link-google?callbackUrl=" + encodeURIComponent(callbackUrl));
        return;
      }
      window.location.assign(role === "STUDENT"
        ? "/auth/continue?callbackUrl=" + encodeURIComponent(callbackUrl)
        : callbackUrl);
    }
    else setMessage(`Email, mật khẩu hoặc vai trò ${getRoleLabel(role)} không đúng.`);
  }

  const googleCallbackUrl = safePostLoginPath(searchParams.get("callbackUrl"), "/dashboard");
  const providerError = searchParams.get("error") === "OAuthAccountNotLinked"
    ? "Email này đã có tài khoản Eduva, nhưng không phải hộp thư do Google quản lý. Đăng nhập mật khẩu cũ một lần để liên kết; những lần sau dùng Google trực tiếp."
    : searchParams.get("error")
      ? "Không thể đăng nhập bằng Google. Vui lòng thử lại hoặc dùng email/mật khẩu."
      : null;

  return (
    <div className="grid gap-4">
      {role !== "ADMIN" ? (
        <>
          <GoogleSignInButton enabled={googleEnabled} callbackUrl={googleCallbackUrl} label="Đăng nhập bằng Google" />
          {role === "TEACHER" ? <p className="text-xs text-slate-500">Tài khoản Google mới có quyền học sinh; quyền giáo viên do quản trị viên cấp.</p> : null}
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> hoặc đăng nhập bằng email <span className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      ) : null}
      {providerError ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">{providerError}</p> : null}
      <form action={submit} className="grid gap-4">
      <input name="email" type="email" required placeholder="Email" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
      <input name="password" type="password" required placeholder="Mật khẩu" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
      <button
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 py-3 font-extrabold text-white shadow-md transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        style={{ backgroundColor: "#f97316", color: "#ffffff", visibility: "visible", opacity: 1 }}
        type="submit"
      >
        ĐĂNG NHẬP
      </button>
      {message ? <p role="status" className="text-sm font-semibold text-slate-700">{message}</p> : null}
      </form>
    </div>
  );
}
