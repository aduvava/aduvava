"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Crown, LogIn, Menu, UserPlus, X } from "lucide-react";

type NavItem = { href: string; label: string };

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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    const oldFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") return setOpen(false);
      if (event.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKeyDown);
      oldFocus?.focus();
    };
  }, [open]);

  const links: NavItem[] = isAuthenticated
    ? [{ href: homeHref, label: "Trang chủ" }, ...nav, ...(isAdmin ? [{ href: "/admin", label: "Quản trị" }] : [])]
    : [
        { href: "/", label: "Trang chủ" },
        { href: "/#gioi-thieu", label: "Giới thiệu" },
        { href: "/#tinh-nang", label: "Tính năng" },
        ...nav.map((item) => ({ ...item, href: "/login?role=student&callbackUrl=" + encodeURIComponent(item.href) })),
      ];

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Mở menu điều hướng"
        aria-controls="mobile-site-menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid h-11 w-11 place-items-center rounded-xl border border-orange-100 bg-orange-50 text-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
      >
        <Menu className="h-6 w-6" />
      </button>
      {open ? createPortal(
        <div className="fixed inset-0 z-[120] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
          <button type="button" aria-label="Đóng menu điều hướng" className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} />
          <div id="mobile-site-menu" ref={panelRef} className="absolute inset-y-0 right-0 flex h-dvh w-[min(88vw,360px)] max-w-full flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-orange-100 px-5 py-4">
              <span className="text-xl font-black text-orange-600">Eduva · Ava</span>
              <button ref={closeRef} type="button" aria-label="Đóng menu" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav aria-label="Điều hướng di động" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-4">
              {links.map((item) => {
                const active = isAuthenticated && pathname === item.href.split("?")[0];
                return (
                  <Link key={item.href + item.label} href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                    className={"flex min-h-12 items-center rounded-xl px-4 py-3 text-sm font-bold transition " + (active ? "bg-orange-100 text-orange-700" : "text-slate-700 hover:bg-orange-50 hover:text-orange-600")}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="space-y-2 border-t border-orange-100 bg-orange-50/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {isAuthenticated ? (
                <>
                  <Link href="/notifications" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 font-bold text-slate-700"><Bell className="h-5 w-5" /> Thông báo</Link>
                  <Link href="/vip" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 font-black text-white"><Crown className="h-5 w-5" /> Nâng cấp VIP</Link>
                </>
              ) : (
                <>
                  <Link href="/login?callbackUrl=/dashboard" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 font-black text-white"><LogIn className="h-5 w-5" /> Đăng nhập</Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 font-bold text-orange-600"><UserPlus className="h-5 w-5" /> Đăng ký</Link>
                  <Link href="/login?role=teacher&callbackUrl=/teacher" onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-center text-sm font-bold text-slate-600">Đăng nhập giáo viên</Link>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
