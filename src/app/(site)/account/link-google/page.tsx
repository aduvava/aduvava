import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/forms/google-signin-button";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { safePostLoginPath } from "@/lib/onboarding";

export default async function LinkGooglePage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=student");

  const params = await searchParams;
  const fallback = user.role === "ADMIN" ? "/admin" : user.role === "TEACHER" ? "/teacher" : "/dashboard";
  const requested = safePostLoginPath(params.callbackUrl, fallback);
  const destination = user.role === "ADMIN"
    ? "/admin"
    : user.role === "TEACHER" && requested.startsWith("/admin")
      ? "/teacher"
      : requested;

  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-5xl place-items-center px-4 py-12 sm:px-6">
      <Card className="w-full max-w-lg">
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black uppercase text-blue-700">
          Bảo vệ tài khoản của bạn
        </span>
        <h1 className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl">Liên kết Google với tài khoản Eduva cũ</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Bạn đã đăng nhập thành công vào tài khoản Eduva bằng mật khẩu.
          Bây giờ hãy xác nhận cùng địa chỉ email trên Google để lần sau có thể đăng nhập bằng Google.
        </p>
        <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Email Eduva cần liên kết</p>
          <p className="mt-1 break-all font-bold text-slate-900">{user.email}</p>
        </div>
        {params.error === "GoogleEmailMismatch" ? (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            Gmail bạn vừa chọn khác email Eduva đang đăng nhập. Hãy chọn đúng tài khoản Google có email hiển thị ở trên.
          </p>
        ) : null}
        <div className="mt-5">
          <GoogleSignInButton
            enabled={googleEnabled}
            label="Liên kết tài khoản Google"
            linkAccount
            selectAccount
            callbackUrl={destination}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Dữ liệu, lịch sử làm bài, điểm, đề đã tạo và quyền truy cập sẽ được giữ ở tài khoản Eduva hiện tại.
          Bước này chỉ cần một lần khi Google không trực tiếp quản lý hộp thư của tài khoản cũ.
        </p>
        <Link href={destination} className="mt-5 block text-center text-sm font-bold text-orange-600 hover:underline">
          Bỏ qua, tiếp tục dùng mật khẩu
        </Link>
      </Card>
    </main>
  );
}
