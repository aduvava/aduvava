import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { RegisterForm } from "@/components/forms/register-form";
import { GoogleSignInButton } from "@/components/forms/google-signin-button";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string; ref?: string }> }) {
  const params = await searchParams;
  // A referral is ALWAYS a student sign-up, never an admin/teacher entry point.
  const isReferral = Boolean(params.ref);
  const teacher = !isReferral && params.role === "teacher";
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <div className={`${isReferral ? "referral-register-screen " : ""}mx-auto grid min-h-[70vh] max-w-5xl place-items-center px-4 py-16 md:px-6`}>
      <Card className="w-full max-w-lg">
        {isReferral ? <Link href="/" className="mb-5 inline-flex text-lg font-black text-orange-600">Educhi · Đăng ký qua lời mời</Link> : null}
        <h1 className="font-display text-4xl font-black text-ink">Tạo tài khoản {teacher ? "giáo viên" : "học sinh"}</h1>
        <p className="mt-3 text-sm text-ink/65">Chỉ cần một tài khoản Educhi để học và giảng dạy. Bạn có thể đổi vai trò bất cứ lúc nào.</p>
        {params.ref ? <p className="mt-3 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">Bạn đang đăng ký qua lời mời của bạn bè. Hoa hồng chỉ được ghi nhận khi bạn mua VIP và thanh toán thành công.</p> : null}
        <div className="mt-6">
          <GoogleSignInButton enabled={googleEnabled} label="Đăng ký nhanh bằng Google" role={teacher ? "teacher" : "student"} callbackUrl={teacher ? "/teacher" : "/dashboard"} />
          <p className="mt-2 text-center text-xs text-slate-500">Chỉ hoàn thiện thông tin lần đầu, tài khoản cũ sẽ không phải nhập lại.</p>
          <div className="my-5 flex items-center gap-3 text-xs font-bold text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> hoặc đăng ký bằng email <span className="h-px flex-1 bg-slate-200" />
          </div>
          <Suspense fallback={<p>Đang tải form...</p>}>
            <RegisterForm />
          </Suspense>
        </div>
        <p className="mt-5 text-sm text-ink/65">Đã có tài khoản? <Link href={teacher ? "/login?role=teacher" : "/login?role=student"} className="font-bold text-clay">Đăng nhập</Link></p>
      </Card>
    </div>
  );
}
