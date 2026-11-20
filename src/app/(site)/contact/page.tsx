import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Liên hệ và hỗ trợ | Educhi",
  description: "Liên hệ Educhi để báo lỗi, đối soát VIP, yêu cầu về dữ liệu cá nhân hoặc phản ánh bản quyền.",
};

const operator = {
  name: process.env.EDUCHI_LEGAL_OPERATOR_NAME?.trim() || null,
  id: process.env.EDUCHI_LEGAL_REGISTRATION_ID?.trim() || null,
  address: process.env.EDUCHI_LEGAL_ADDRESS?.trim() || null,
  email: process.env.EDUCHI_SUPPORT_EMAIL?.trim() || null,
  phone: process.env.EDUCHI_SUPPORT_PHONE?.trim() || null,
};

export default function ContactPage() {
  const verified = Boolean(operator.name && operator.id && operator.address);
  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 py-10 text-slate-900 sm:px-6 sm:py-14">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-widest text-orange-600">Educhi · Hỗ trợ</p>
          <h1 className="mt-3 text-3xl font-black">Liên hệ và hỗ trợ</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Tiếp nhận báo lỗi, đối soát/hoàn tiền VIP, yêu cầu truy cập hoặc xóa dữ liệu, hỗ trợ tài khoản và báo cáo nội dung vi phạm bản quyền.
          </p>
          <h2 className="mt-7 text-lg font-extrabold">Thông tin chủ quản</h2>
          {verified ? (
            <dl className="mt-3 space-y-3 text-sm leading-6">
              <div><dt className="font-semibold text-slate-500">Chủ thể vận hành</dt><dd>{operator.name}</dd></div>
              <div><dt className="font-semibold text-slate-500">Mã số thuế / đăng ký hợp lệ</dt><dd>{operator.id}</dd></div>
              <div><dt className="font-semibold text-slate-500">Địa chỉ</dt><dd>{operator.address}</dd></div>
              {operator.email ? <div><dt className="font-semibold text-slate-500">Email hỗ trợ</dt><dd><a href={`mailto:${operator.email}`} className="break-all text-orange-700 underline">{operator.email}</a></dd></div> : null}
              {operator.phone ? <div><dt className="font-semibold text-slate-500">Điện thoại</dt><dd>{operator.phone}</dd></div> : null}
            </dl>
          ) : (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              Thông tin chủ quản chưa được xác minh để công bố đầy đủ. Educhi cần bổ sung tên chủ thể, địa chỉ và thông tin đăng ký hợp lệ. Bạn vẫn có thể gửi hỗ trợ qua biểu mẫu.
            </p>
          )}
          <p className="mt-6 text-xs leading-6 text-slate-500">Xem <Link href="/chinh-sach/bao-mat" className="font-bold text-orange-700 underline">Chính sách bảo mật</Link> về việc xử lý thông tin bạn gửi. Người đã đăng nhập có thể <Link href="/quyen-du-lieu" className="font-bold text-orange-700 underline">theo dõi yêu cầu về dữ liệu</Link>.</p>
        </section>
        <section className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black">Gửi yêu cầu</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Ghi rõ chủ đề, email tài khoản và bằng chứng nếu liên quan đến giao dịch hoặc bản quyền. Không gửi mật khẩu ngân hàng, OTP hoặc thông tin nhạy cảm không cần thiết.
          </p>
          <div className="mt-5"><ContactForm /></div>
        </section>
      </div>
    </main>
  );
}
