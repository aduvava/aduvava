import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = {
  title: "Đăng nhập Admin | Ava",
  description: "Cổng đăng nhập quản trị Ava.",
};

function getSafeCallbackUrl(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/admin";
  return value;
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);

  if (user?.role === "ADMIN") redirect(callbackUrl);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Ava Admin</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Đăng nhập quản trị</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">Cổng này tách khỏi website học sinh và chỉ chấp nhận tài khoản có quyền ADMIN.</p>
        <p className="mt-3 rounded-2xl bg-black/20 px-4 py-3 text-xs font-semibold text-white/70">Demo: admin@example.com / Admin@123</p>
        <div className="mt-6">
          <AdminLoginForm callbackUrl={callbackUrl} />
        </div>
      </section>
    </main>
  );
}
