import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { LoginForm } from "@/components/forms/login-form";
import { getCurrentUser } from "@/lib/auth";

function getSafeCallbackUrl(value: string | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

function getLoginCopy(role: string | undefined) {
  if (role === "admin") {
    return {
      label: "Dành cho quản trị viên",
      title: "Đăng nhập Admin",
      demo: "admin@example.com",
      password: "Admin@123",
      registerRole: "student",
      switchHref: "/login?role=teacher",
      switchLabel: "Chuyển sang đăng nhập Giáo viên",
      shellClass: "",
    };
  }

  if (role === "teacher") {
    return {
      label: "Dành cho giáo viên",
      title: "Đăng nhập Giáo viên",
      demo: "teacher@example.com",
      password: "Teacher@123",
      registerRole: "teacher",
      switchHref: "/login?role=student",
      switchLabel: "Chuyển sang đăng nhập Học sinh",
      shellClass: "",
    };
  }

  return {
    label: "Dành cho học sinh",
    title: "Đăng nhập Học sinh",
    demo: "demo@example.com",
    password: "Demo@123",
    registerRole: "student",
    switchHref: "/login?role=teacher",
    switchLabel: "Chuyển sang đăng nhập Giáo viên",
    shellClass: "student-login-page",
  };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ role?: string; callbackUrl?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const copy = getLoginCopy(params.role);

  if (user && !params.role) {
    if (user.role === "STUDENT") redirect("/onboarding");
    const fallback = user.role === "ADMIN" ? "/admin" : "/teacher";
    redirect(getSafeCallbackUrl(params.callbackUrl, fallback));
  }

  return (
    <main className={`${copy.shellClass} mx-auto grid min-h-[70vh] max-w-5xl place-items-center px-4 py-16 md:px-6`}>
      <Card className="w-full max-w-md">
        <span className="inline-flex rounded-full bg-orange-100 px-3 py-1.5 text-xs font-black uppercase text-orange-600">{copy.label}</span>
        <h1 className="mt-4 font-display text-4xl font-black text-ink">{copy.title}</h1>
        <p className="mt-3 text-sm text-ink/65">
          Demo: `{copy.demo}` / `{copy.password}`.
        </p>
        <div className="mt-6">
          <Suspense fallback={<p>Đang tải form...</p>}>
            <LoginForm />
          </Suspense>
        </div>
        {params.role !== "admin" ? (
          <p className="mt-5 text-sm text-ink/65">
            Chưa có tài khoản?{" "}
            <Link href={`/register?role=${copy.registerRole}`} className="font-bold text-clay">
              Đăng ký
            </Link>
          </p>
        ) : null}
        <Link href={copy.switchHref} className="mt-3 block text-sm font-bold text-slate-500 hover:text-orange-600">
          {copy.switchLabel}
        </Link>
      </Card>
    </main>
  );
}
