import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PrivacyRequestCenter } from "@/components/privacy-request-center";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Quyền dữ liệu và quyền riêng tư | Educhi",
  description: "Gửi và theo dõi yêu cầu liên quan đến dữ liệu cá nhân trên Educhi.",
};

export default async function PrivacyRightsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=student&callbackUrl=/quyen-du-lieu");

  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 py-10 text-slate-900 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <nav aria-label="Đường dẫn" className="text-sm text-slate-500">
          <Link href="/" className="hover:text-orange-600">Trang chủ</Link> / Quyền dữ liệu
        </nav>
        <section className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Educhi · Bảo vệ dữ liệu</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Quyền dữ liệu của tôi</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Gửi yêu cầu truy cập, chỉnh sửa, xóa dữ liệu hoặc rút lại sự đồng ý khi áp dụng.
            Yêu cầu sẽ được ghi nhận để Admin xác minh và giải quyết; không tự động xóa tài khoản
            khi bạn nhấn gửi.
          </p>
          <p className="mt-3 text-xs leading-6 text-slate-500">
            Nếu bạn là cha mẹ/người đại diện và không đăng nhập bằng chính tài khoản của trẻ,
            hãy <Link href="/contact" className="font-bold text-orange-700 underline">liên hệ Educhi</Link> để được xác minh quyền đại diện.
            Đọc thêm <Link href="/chinh-sach/bao-mat" className="font-bold text-orange-700 underline">Chính sách bảo mật</Link>.
          </p>
          <PrivacyRequestCenter email={user.email ?? ""} />
        </section>
      </div>
    </main>
  );
}
