import Link from "next/link";
import { getServerSession } from "next-auth";
import { Bell, Crown, Search } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ButtonLink } from "@/components/ui";
import { MascotAvatar } from "@/components/mascot-avatar";
import { HeaderAccountControls } from "@/components/header-account-controls";

const studentNav = [
  { href: "/exams", label: "Đề thi" },
  { href: "/documents", label: "Tài liệu" },
  { href: "/dich-vu", label: "Cửa hàng" },
  { href: "/leaderboard", label: "Bảng xếp hạng" },
  { href: "/classes", label: "Lớp học" },
];

const teacherNav = [
  { href: "/teacher", label: "Trang chủ" },
  { href: "/teacher?tab=classes", label: "Quản lí lớp" },
  { href: "/exams", label: "Đề thi" },
  { href: "/documents", label: "Tài liệu" },
];

function loginHrefFor(path: string) {
  return `/login?role=student&callbackUrl=${encodeURIComponent(path)}`;
}

export async function SiteHeader() {
  const session = await getServerSession(authOptions);
  const account = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          exp: true,
          subscriptions: {
            where: { status: "ACTIVE", endsAt: { gt: new Date() } },
            orderBy: { endsAt: "desc" },
            take: 1,
            select: { endsAt: true },
          },
          _count: { select: { notifications: { where: { isRead: false } } } },
        },
      })
    : null;

  const initials =
    session?.user?.name
      ?.split(" ")
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() ?? "HS";
  const isTeacher = session?.user?.role === "TEACHER";
  const homeHref = isTeacher ? "/teacher" : "/dashboard";
  const nav = isTeacher ? teacherNav : studentNav;
  const vipEndsAt = account?.subscriptions[0]?.endsAt ?? null;
  const vipDaysLeft = vipEndsAt ? Math.max(1, Math.ceil((vipEndsAt.getTime() - Date.now()) / 86_400_000)) : null;

  if (!session?.user) {
    return (
      <header className="fixed inset-x-0 top-0 z-[70] border-b border-orange-100/80 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 p-1 shadow-lg shadow-orange-200">
              <MascotAvatar />
            </span>
            <span className="text-2xl font-black tracking-tight text-orange-500">Ava</span>
          </Link>

          <nav className="intro-page-nav hidden items-center gap-5 text-sm font-bold text-slate-600">
            <Link href="/#gioi-thieu" className="whitespace-nowrap transition hover:text-orange-500">
              Giới thiệu
            </Link>
            <Link href="/#tinh-nang" className="whitespace-nowrap transition hover:text-orange-500">
              Tính năng
            </Link>
          </nav>

          <nav className="hidden items-center gap-4 text-[13px] font-bold text-slate-600 lg:flex xl:gap-5 xl:text-sm">
            {studentNav.map((item) => (
              <Link key={item.label} href={loginHrefFor(item.href)} className="whitespace-nowrap transition hover:text-orange-500">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-600 sm:gap-3">
            <Link href="/#gioi-thieu" className="hidden rounded-full px-4 py-2.5 transition hover:bg-orange-50 hover:text-orange-500 sm:inline-flex">
              Giới thiệu
            </Link>
            <Link href="/dich-vu" className="hidden rounded-full px-4 py-2.5 transition hover:bg-orange-50 hover:text-orange-500 sm:inline-flex">
              Cửa hàng
            </Link>
            <Link href="/#tinh-nang" className="hidden rounded-full px-4 py-2.5 transition hover:bg-orange-50 hover:text-orange-500 sm:inline-flex">
              Tính năng
            </Link>
            <Link
              href="/login?callbackUrl=/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-3 text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed inset-x-0 top-0 z-[70] border-b border-orange-100/80 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Link href={homeHref} title="Về trang chủ" className="flex shrink-0 items-center gap-2">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 p-1 shadow-md shadow-orange-200">
            <MascotAvatar />
          </span>
          <span className="text-xl font-black tracking-tight text-orange-500">Ava</span>
        </Link>

        <nav className="intro-page-nav hidden items-center gap-5 text-sm font-bold text-slate-600">
          <Link href="/#gioi-thieu" className="whitespace-nowrap transition hover:text-orange-500">
            Giới thiệu
          </Link>
          <Link href="/#tinh-nang" className="whitespace-nowrap transition hover:text-orange-500">
            Tính năng
          </Link>
        </nav>

        <nav className="hidden items-center gap-4 text-[13px] font-bold text-slate-600 lg:flex xl:gap-5 xl:text-sm">
          {nav.map((item) => (
            <Link key={item.label} href={item.href} className="whitespace-nowrap transition hover:text-orange-500">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          <label className="hidden h-10 w-48 items-center gap-2 rounded-full bg-slate-100 px-4 xl:flex 2xl:w-60">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              aria-label="Tìm kiếm"
              placeholder="Tìm bài học..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
            />
          </label>
          <Link
            href="/notifications"
            aria-label="Thông báo"
            className="relative grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-orange-50 hover:text-orange-500"
          >
            <Bell className="h-5 w-5" />
            {account?._count.notifications ? (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-orange-500 px-1 text-[9px] font-black text-white">
                {Math.min(account._count.notifications, 9)}
              </span>
            ) : null}
          </Link>
          {session.user.role === "ADMIN" ? (
            <ButtonLink href="/admin" className="hidden bg-orange-500 px-4 py-2 hover:bg-orange-600 md:inline-flex">
              Admin
            </ButtonLink>
          ) : null}
          <Link
            href="/vip"
            className="hidden items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 md:inline-flex"
          >
            <Crown className="h-4 w-4 fill-current" />
            Nạp vip
          </Link>
          <HeaderAccountControls
            initialExp={account?.exp ?? 0}
            vipDaysLeft={vipDaysLeft}
            user={{
              name: session.user.name ?? "Tài khoản Ava",
              email: session.user.email ?? "",
              image: session.user.image ?? null,
              initials,
            }}
          />
        </div>
      </div>
    </header>
  );
}
