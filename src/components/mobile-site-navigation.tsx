"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
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
  if (label === "Môn học") return BookOpen;
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
        ...(!isTeacher ? [{ href: "/dashboard#mon-hoc", label: "Môn học" }] : []),
        ...nav.filter((item) => item.href !== homeHref),
        ...(isTeacher ? [{ href: "/vip", label: "VIP" }] : []),
        ...(isAdmin ? [{ href: "/admin", label: "Quản trị" }] : []),
      ]
    : [
        { href: "/", label: "Trang chủ" },
        { href: loginFor("/dashboard#mon-hoc"), label: "Môn học" },
        ...nav.filter((item) => ["Đề thi", "Tài liệu", "Cửa hàng", "Lớp học"].includes(item.label))
          .map((item) => ({ ...item, href: loginFor(item.href) })),
        { href: "/login?callbackUrl=/dashboard", label: "Đăng nhập" },
      ];

  const gridColumns = links.length > 7
    ? "grid-cols-4 min-[480px]:grid-cols-8"
    : links.length === 7
      ? "grid-cols-4 min-[420px]:grid-cols-7"
      : links.length === 6
        ? "grid-cols-3 min-[420px]:grid-cols-6"
        : links.length === 5
          ? "grid-cols-5"
          : "grid-cols-4";

  return (
    <nav
      aria-label="Điều hướng chính trên điện thoại"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[95] border-t border-orange-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden"
    >
      <div className={"mx-auto grid max-w-xl gap-0.5 px-1.5 py-1.5 " + gridColumns}>
        {links.map((item) => {
          const target = item.href.split("?")[0].split("#")[0];
          const active = isAuthenticated &&
            item.label !== "Môn học" &&
            (pathname === target || (target !== "/" && pathname.startsWith(target + "/")));
          const Icon = mobileIcon(item.href, item.label);
          return (
            <Link
              key={item.label + item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "flex min-h-[46px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 " +
                (active ? "bg-orange-50 font-black text-orange-600" : "font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600")
              }
            >
              <Icon aria-hidden="true" className="h-[19px] w-[19px] shrink-0" strokeWidth={active ? 2.6 : 2} />
              <span className="max-w-full whitespace-nowrap text-[10px] leading-3">{mobileLabel(item.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
