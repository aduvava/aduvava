import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Gift, GraduationCap, ShieldCheck } from "lucide-react";
import { GoogleSignInButton } from "@/components/forms/google-signin-button";
import { RegisterForm } from "@/components/forms/register-form";
import { InviteSignOutButton } from "@/components/invite-signout-button";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { COOKIE_NAME, REFERRAL_CODE_PATTERN, parseInviteToken } from "@/lib/referral-invites";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Đăng ký học sinh qua lời mời | Educhi",
  description: "Tham gia Educhi qua liên kết giới thiệu của bạn bè.",
  robots: { index: false, follow: false },
};

export default async function InviteSignupPage({ params }: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();
  const validCode = REFERRAL_CODE_PATTERN.test(normalized);
  const inviter = validCode ? await prisma.user.findUnique({
    where: { referralCode: normalized }, select: { id: true },
  }) : null;
  const token = parseInviteToken((await cookies()).get(COOKIE_NAME)?.value, process.env.NEXTAUTH_SECRET);
  const verified = Boolean(inviter && token?.inviterId === inviter.id);
  const currentUser = await getCurrentUser();
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="inline-flex items-center gap-2 font-black text-orange-600">
          <GraduationCap className="h-6 w-6" /> Educhi
        </Link>
        <section className="mt-5 rounded-[2rem] border border-orange-100 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,.07)] sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700">
            <Gift className="h-4 w-4" /> Mời bạn bè cùng học
          </span>
          <h1 className="mt-4 text-3xl font-black text-slate-950">
            Đăng ký tài khoản học sinh
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Tạo tài khoản Educhi để luyện đề, xem lý thuyết và học cùng bạn bè.
          </p>

          {!verified ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
              Link mời chưa được xác minh hoặc đã hết hạn. Vui lòng
              {validCode ? (
                <> <Link className="font-black underline" href={"/r/" + normalized}>mở lại liên kết giới thiệu</Link> để đăng ký.</>
              ) : " yêu cầu người mời gửi liên kết mới."}
            </div>
          ) : currentUser ? (
            <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-sm font-bold leading-6 text-orange-900">
                Trình duyệt này đang đăng nhập một tài khoản Educhi.
                Lời mời chỉ áp dụng cho tài khoản mới; tài khoản Admin hoặc tài khoản đã có không được tính là người được giới thiệu.
              </p>
              <InviteSignOutButton code={normalized} />
              <p className="mt-3 text-xs font-medium text-slate-600">
                Bạn cũng có thể gửi link cho bạn bè và để họ mở trong trình duyệt của họ.
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                Đã xác nhận lời mời. Khi bạn mua VIP và thanh toán thành công, người giới thiệu sẽ được ghi nhận 10% giá trị gói.
              </div>
              <GoogleSignInButton
                enabled={googleEnabled}
                label="Đăng ký học sinh bằng Google"
                role="student"
                selectAccount
                callbackUrl="/dashboard"
              />
              <p className="my-5 text-center text-xs font-bold text-slate-400">hoặc đăng ký bằng email</p>
              <Suspense fallback={<p className="text-sm text-slate-500">Đang tải biểu mẫu...</p>}>
                <RegisterForm />
              </Suspense>
            </div>
          )}
          <p className="mt-5 text-center text-xs font-medium text-slate-500">
            Cổng dành cho học sinh. Trang quản trị Admin không tham gia quy trình giới thiệu.
          </p>
        </section>
      </div>
    </main>
  );
}
