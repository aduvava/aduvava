"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  ArrowUpRight,
  BookOpenCheck,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileClock,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleMore,
  Package,
  PenLine,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const navGroups = [
  {
    label: "TỔNG QUAN",
    items: [{ href: "/admin", label: "Tổng quan", description: "Tổng quan vận hành", Icon: LayoutDashboard }],
  },
  {
    label: "HỌC TẬP & NỘI DUNG",
    items: [
      { href: "/admin/exams", label: "Đề thi", description: "Kho đề và xuất bản", Icon: ClipboardList },
      { href: "/admin/questions", label: "Ngân hàng câu hỏi", description: "Câu hỏi và đáp án", Icon: BookOpenCheck },
      { href: "/admin/documents", label: "Duyệt tài liệu", description: "Kiểm duyệt nội dung", Icon: FileClock },
      { href: "/admin/theory-chapters", label: "Chương lý thuyết", description: "Cấu trúc kiến thức", Icon: FileText },
      { href: "/admin/theory-lessons", label: "Bài lý thuyết", description: "Nội dung bài học", Icon: BookOpenCheck },
      { href: "/admin/blogs", label: "Bài viết & Blog", description: "Truyền thông Educhi", Icon: PenLine },
    ],
  },
  {
    label: "NGƯỜI DÙNG & DỊCH VỤ",
    items: [
      { href: "/admin/users", label: "Người dùng", description: "Học sinh và giáo viên", Icon: Users },
      { href: "/admin/support", label: "Hỗ trợ AI & Admin", description: "Hộp thư hỗ trợ", Icon: MessageCircleMore },
      { href: "/admin/store-items", label: "Cửa hàng EXP", description: "Vật phẩm và kho đồ", Icon: Package },
    ],
  },
  {
    label: "TÀI CHÍNH & GÓI DỊCH VỤ",
    items: [
      { href: "/admin/plans", label: "Gói thành viên", description: "Giá và quyền lợi", Icon: ShieldCheck },
      { href: "/admin/subscriptions", label: "Theo dõi Pro", description: "Thuê bao đang hoạt động", Icon: CreditCard },
      { href: "/admin/payments", label: "Thanh toán", description: "Đối soát giao dịch", Icon: CreditCard },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string, email: string) {
  const value = name.trim() || email;
  return value.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AD";
}

function SidebarContent({
  name,
  email,
  pathname,
  onNavigate,
}: {
  name: string;
  email: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Link href="/admin" onClick={onNavigate} className="admin-brand">
        <span className="admin-brand-mark"><LayoutDashboard className="h-5 w-5" /></span>
        <span className="min-w-0">
          <strong>educhi<span>·</span></strong>
          <small>CONTROL CENTER</small>
        </span>
      </Link>

      <div className="admin-workspace-chip">
        <span className="admin-workspace-orb" />
        <span className="min-w-0 flex-1"><strong>Educhi Platform</strong><small>Production workspace</small></span>
        <ChevronRight className="h-4 w-4 text-white/35" />
      </div>

      <nav aria-label="Điều hướng quản trị" className="admin-sidebar-nav">
        {navGroups.map((group) => (
          <section key={group.label} className="admin-nav-group">
            <p className="admin-nav-label">{group.label}</p>
            <div className="grid gap-1">
              {group.items.map(({ href, label, description, Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`admin-nav-link${active ? " is-active" : ""}`}
                  >
                    <span className="admin-nav-icon"><Icon className="h-[18px] w-[18px]" /></span>
                    <span className="min-w-0 flex-1"><strong>{label}</strong><small>{description}</small></span>
                    {active ? <span className="admin-nav-active-dot" /> : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="admin-sidebar-bottom">
        <Link href="/dashboard" onClick={onNavigate} className="admin-view-site">
          <span>Trở về website</span><ArrowUpRight className="h-4 w-4" />
        </Link>
        <div className="admin-profile-card">
          <span className="admin-profile-avatar">{initials(name, email)}</span>
          <span className="min-w-0 flex-1"><strong>{name || "Quản trị viên"}</strong><small>{email}</small></span>
          <span className="admin-profile-role">ADMIN</span>
        </div>
        <button type="button" onClick={() => void signOut({ callbackUrl: "/admin/login" })} className="admin-logout-button">
          <LogOut className="h-4 w-4" /> Đăng xuất
        </button>
      </div>
    </>
  );
}

export function AdminShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string | null; email: string };
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentItem = navGroups.flatMap((group) => group.items).find((item) => isActive(pathname, item.href));
  const pageTitle = currentItem?.label || "Quản trị";

  return (
    <div className="admin-app-shell">
      <aside className="admin-sidebar-desktop">
        <SidebarContent name={user.name || ""} email={user.email} pathname={pathname} />
      </aside>

      {mobileOpen ? (
        <div className="admin-mobile-overlay" onClick={() => setMobileOpen(false)}>
          <aside className="admin-mobile-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="admin-mobile-drawer-top">
              <span>Điều hướng</span>
              <button type="button" aria-label="Đóng menu" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <SidebarContent name={user.name || ""} email={user.email} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="admin-main-column">
        <header className="admin-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Mở menu quản trị" onClick={() => setMobileOpen(true)} className="admin-mobile-menu-button"><Menu className="h-5 w-5" /></button>
            <div className="min-w-0">
              <p className="admin-breadcrumb"><span>EDUCHI</span><ChevronRight className="h-3 w-3" /><strong>{pageTitle}</strong></p>
              <p className="admin-topbar-subtitle">Không gian vận hành và quản lý nền tảng</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="admin-live-status"><span /> Hệ thống hoạt động</span>
            <ThemeToggle />
            <Link href="/dashboard" className="admin-topbar-site-link">Mở website <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            <span className="admin-topbar-avatar">{initials(user.name || "", user.email)}</span>
          </div>
        </header>
        <div className="admin-page-content">{children}</div>
        <footer className="admin-footer"><span>EDUCHI CONTROL CENTER</span><span>Quản trị nền tảng học tập</span></footer>
      </div>
    </div>
  );
}
