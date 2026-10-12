import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpenCheck,
  ClipboardList,
  CreditCard,
  FileClock,
  FileText,
  LayoutDashboard,
  LogOut,
  PenLine,
  Store,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

const adminNav = [
  { href: "/admin", label: "Tổng quan", Icon: LayoutDashboard },
  { href: "/admin/documents", label: "Tài liệu", Icon: FileClock },
  { href: "/admin/exams", label: "Đề thi", Icon: ClipboardList },
  { href: "/admin/questions", label: "Câu hỏi", Icon: BookOpenCheck },
  { href: "/admin/subjects", label: "Môn học", Icon: BookOpenCheck },
  { href: "/admin/theory-chapters", label: "Chương lý thuyết", Icon: FileText },
  { href: "/admin/theory-lessons", label: "Bài lý thuyết", Icon: FileText },
  { href: "/admin/users", label: "Người dùng", Icon: Users },
  { href: "/admin/blogs", label: "Blog", Icon: PenLine },
  { href: "/admin/store-items", label: "Cửa hàng EXP", Icon: Store },
  { href: "/admin/plans", label: "Gói thành viên", Icon: CreditCard },
  { href: "/admin/payments", label: "Thanh toán", Icon: CreditCard },
];

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <main className="admin-shell min-h-screen bg-slate-100 text-slate-950 lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-slate-950 text-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <Link href="/admin" className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500">
                <LayoutDashboard className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-lg font-black tracking-tight">Ava Admin</span>
                <span className="text-xs font-bold text-white/45">Trung tâm quản trị</span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
            {adminNav.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-white/68 transition hover:bg-white/10 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-sm font-extrabold text-white/75 transition hover:bg-white/12 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Về website
            </Link>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin" className="flex items-center gap-2 text-sm font-black text-slate-950">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-white">
                <LayoutDashboard className="h-4 w-4" />
              </span>
              Ava Admin
            </Link>
            <Link href="/dashboard" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
              Website
            </Link>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {adminNav.map(({ href, label }) => (
              <Link key={href} href={href} className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-600">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {children}
      </div>
    </main>
  );
}
