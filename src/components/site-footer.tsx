import Link from "next/link";

const support = [
  { href: "/contact", label: "Liên hệ và hỗ trợ" },
  { href: "/quyen-du-lieu", label: "Yêu cầu xóa tài khoản / dữ liệu" },
  { href: "/chinh-sach/cong-dong", label: "Quy định cộng đồng" },
  { href: "/chinh-sach/ban-quyen", label: "Bản quyền và báo cáo vi phạm" },
];
const legal = [
  { href: "/chinh-sach/bao-mat", label: "Chính sách bảo mật" },
  { href: "/chinh-sach/dieu-khoan", label: "Điều khoản sử dụng" },
  { href: "/chinh-sach/thanh-toan", label: "Thanh toán và hoàn tiền" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-orange-100 bg-[#fffaf2] text-slate-800">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-11 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.35fr_1fr_1fr]">
        <div>
          <Link href="/" className="font-display text-3xl font-black text-orange-600">Educhi</Link>
          <p className="mt-3 max-w-sm text-sm leading-7 text-slate-600">Nền tảng luyện đề, chữa lỗi, theo dõi tiến bộ và học theo lớp dành cho học sinh.</p>
          <p className="mt-3 text-xs leading-6 text-slate-500">Educhi không phải đơn vị tổ chức hoặc chứng nhận kết quả kỳ thi chính thức.</p>
        </div>
        <nav aria-label="Hỗ trợ">
          <h2 className="font-extrabold text-slate-900">Hỗ trợ</h2>
          <ul className="mt-3 space-y-3">
            {support.map((s) => <li key={s.href}><Link href={s.href} className="text-sm font-medium text-slate-600 hover:text-orange-700 hover:underline">{s.label}</Link></li>)}
          </ul>
        </nav>
        <nav aria-label="Chính sách và điều khoản">
          <h2 className="font-extrabold text-slate-900">Chính sách & điều khoản</h2>
          <ul className="mt-3 space-y-3">
            {legal.map((s) => <li key={s.href}><Link href={s.href} className="text-sm font-medium text-slate-600 hover:text-orange-700 hover:underline">{s.label}</Link></li>)}
          </ul>
        </nav>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 border-t border-orange-100 px-5 py-5 text-xs text-slate-500 sm:px-6">
        <span>© {new Date().getFullYear()} Educhi. Tôn trọng bản quyền và dữ liệu cá nhân.</span>
        <Link href="/contact" className="font-bold text-orange-700 hover:underline">Thông tin chủ quản & liên hệ</Link>
      </div>
    </footer>
  );
}
