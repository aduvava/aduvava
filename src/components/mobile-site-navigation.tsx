"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Crown,
  FileText,
  GraduationCap,
  House,
  LogIn,
  Shield,
  ShoppingBag,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string };

function mobileLabel(label: string) {
  if (label === "Bảng xếp hạng") return "Xếp hạng";
  if (label === "Quản lí lớp") return "Quản lớp";
  return label;
}

function mobileIcon(href: string, label: string): LucideIcon {
  // Use labels first because guest links deliberately redirect through /login.
  if (label === "Đề thi") return ClipboardList;
  if (label === "Tài liệu") return FileText;
  if (label === "Cửa hàng") return ShoppingBag;
  if (label === "Bảng xếp hạng") return Trophy;
  if (label === "Lớp học" || label === "Quản lí lớp") return Users;
  if (label === "VIP") return Crown;
  if (label === "Quản trị") return Shield;
  if (label === "Đăng nhập") return LogIn;
  if (href.startsWith("/teacher")) return GraduationCap;
  return House;
}

export function MobileSiteNavigation({
  nav,
  homeHref,
  isAuthenticated,
  isAdmin = false,
}: {
  nav: NavItem[];
  homeHref: string;
  isAuthenticated: boolean;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const isTeacher = homeHref === "/teacher";
  const loginFor = (destination: string) =>
    "/login?role=student&callbackUrl=" + encodeURIComponent(destination);

  // All primary destinations are visible without opening a hamburger menu.
  const links: NavItem[] = isAuthenticated
    ? [
        { href: homeHref, label: "Trang chủ" },
        ...nav.filter((item) => item.href !== homeHref),
        ...(isTeacher ? [{ href: "/vip", label: "VIP" }] : []),
        ...(isAdmin ? [{ href: "/admin", label: "Quản trị" }] : []),
      ]
    : [
        { href: "/", label: "Trang chủ" },
        ...nav.map((item) => ({ ...item, href: loginFor(item.href) })),
        { href: "/login?callbackUrl=/dashboard", label: "Đăng nhập" },
      ];

  // Trang giới thiệu chỉ hiển thị nội dung chính, không che màn hình bằng tab cố định.
  if (pathname === "/" || pathname === "/ve-chung-toi") {
    return null;
  }

  return (
    <nav
      aria-label="Điều hướng chính trên điện thoại"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[60] border-t border-orange-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden"
    >
      <div
        className="mx-auto grid w-full max-w-2xl gap-0 px-0.5 py-1"
        style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
      >
        {links.map((item) => {
          const target = item.href.split("?")[0].split("#")[0];
          const active = isAuthenticated &&
            (pathname === target || (target !== "/" && pathname.startsWith(target + "/")));
          const Icon = mobileIcon(item.href, item.label);
          return (
            <Link
              key={item.label + item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0 py-1 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 " +
                (active ? "bg-orange-50 font-black text-orange-600" : "font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600")
              }
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0 sm:h-[19px] sm:w-[19px]" strokeWidth={active ? 2.6 : 2} />
              <span className="max-w-full whitespace-nowrap text-[8px] font-bold leading-3 tracking-tight min-[400px]:text-[9px] sm:text-[10px]">{mobileLabel(item.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
