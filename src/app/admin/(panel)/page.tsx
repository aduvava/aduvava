import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileClock,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessagesSquare,
  Package,
  PenLine,
  ReceiptText,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin | Ava",
  description: "Bảng điều khiển quản trị Ava.",
};

const resourceLinks: {
  href: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  tone: string;
}[] = [
  {
    href: "/admin/documents",
    title: "Duyệt tài liệu",
    description: "Kiểm tra, phê duyệt và xử lý báo cáo tài liệu.",
    Icon: FileClock,
    tone: "bg-amber-50 text-amber-600",
  },
  {
    href: "/admin/exams",
    title: "Đề thi",
    description: "Quản lý đề, năm thi, cấu trúc và trạng thái xuất bản.",
    Icon: ClipboardList,
    tone: "bg-orange-50 text-orange-600",
  },
  {
    href: "/admin/questions",
    title: "Câu hỏi",
    description: "Thêm câu hỏi, đáp án và giải thích theo từng đề.",
    Icon: MessagesSquare,
    tone: "bg-sky-50 text-sky-600",
  },
  {
    href: "/admin/subjects",
    title: "Môn học",
    description: "Thiết lập môn, slug, icon và nhóm kỳ thi.",
    Icon: BookOpenCheck,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    href: "/admin/theory-chapters",
    title: "Chương lý thuyết",
    description: "Tạo chương theo môn, cấp học và lớp.",
    Icon: BookOpenCheck,
    tone: "bg-green-50 text-green-700",
  },
  {
    href: "/admin/theory-lessons",
    title: "Bài lý thuyết",
    description: "Nhập nội dung từng bài trong các chương lý thuyết.",
    Icon: FileText,
    tone: "bg-orange-50 text-orange-600",
  },
  {
    href: "/admin/users",
    title: "Người dùng",
    description: "Tạo tài khoản học sinh, giáo viên và admin.",
    Icon: Users,
    tone: "bg-blue-50 text-blue-600",
  },
  {
    href: "/admin/blogs",
    title: "Blog",
    description: "Quản lý bài viết, bản nháp và bài đã xuất bản.",
    Icon: PenLine,
    tone: "bg-rose-50 text-rose-600",
  },
  {
    href: "/admin/store-items",
    title: "Cửa hàng",
    description: "Vật phẩm, ảnh nền, gói học tập và quà tặng.",
    Icon: Store,
    tone: "bg-lime-50 text-lime-700",
  },
  {
    href: "/admin/plans",
    title: "Gói thành viên",
    description: "Chỉnh giá, thời hạn và quyền lợi của từng gói đăng ký.",
    Icon: CreditCard,
    tone: "bg-yellow-50 text-yellow-700",
  },
  {
    href: "/admin/subscriptions",
    title: "Theo dõi Pro",
    description: "Theo dõi gói Pro đang hoạt động và hết hạn.",
    Icon: ShieldCheck,
    tone: "bg-teal-50 text-teal-600",
  },
  {
    href: "/admin/payments",
    title: "Thanh toán",
    description: "Kiểm tra giao dịch mock và trạng thái chi trả.",
    Icon: CreditCard,
    tone: "bg-slate-100 text-slate-700",
  },
];

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(value);
}

function StatCard({
  label,
  value,
  note,
  Icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  Icon: LucideIcon;
  tone: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <span className={clsx("grid h-12 w-12 place-items-center rounded-2xl", tone)}>
          <Icon className="h-6 w-6" />
        </span>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-500">{note}</span>
      </div>
      <p className="mt-5 text-sm font-extrabold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
    </article>
  );
}

const systemStatuses: {
  label: string;
  value: string;
  Icon: LucideIcon;
  tone: string;
}[] = [
  { label: "Lượt nộp bài", value: "attempts", Icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
  { label: "Gói Pro đang hoạt động", value: "subscriptions", Icon: ShieldCheck, tone: "bg-teal-50 text-teal-600" },
  { label: "Tài liệu chờ duyệt", value: "documents", Icon: FileText, tone: "bg-amber-50 text-amber-600" },
  { label: "Vật phẩm cửa hàng", value: "storeItems", Icon: Package, tone: "bg-lime-50 text-lime-700" },
];

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [
    studentCount,
    teacherCount,
    examCount,
    questionCount,
    pendingDocumentCount,
    openReportCount,
    submittedAttemptCount,
    activeSubscriptionCount,
    storeItemCount,
    paidPaymentTotal,
    pendingPaymentCount,
    recentUsers,
    pendingDocuments,
    recentPayments,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.exam.count(),
    prisma.question.count(),
    prisma.document.count({ where: { status: "PENDING" } }),
    prisma.documentReport.count({ where: { status: "OPEN" } }),
    prisma.attempt.count({ where: { status: "SUBMITTED" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.storeItem.count(),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.document.findMany({
      where: { status: "PENDING" },
      include: {
        uploader: { select: { name: true, email: true } },
        reports: { where: { status: "OPEN" }, select: { id: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.payment.findMany({
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const paidRevenue = paidPaymentTotal._sum.amount ?? 0;
  const systemStatusValues: Record<string, string> = {
    attempts: formatNumber(submittedAttemptCount),
    subscriptions: formatNumber(activeSubscriptionCount),
    documents: formatNumber(pendingDocumentCount),
    storeItems: formatNumber(storeItemCount),
  };

  return (
    <main className="admin-dashboard min-h-screen bg-orange-50/40 pb-20">
      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-orange-500 shadow-sm">
              <LayoutDashboard className="h-4 w-4" />
              Admin
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Bảng điều khiển quản trị</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Theo dõi vận hành Ava, duyệt nội dung và đi nhanh vào các khu vực CRUD quan trọng.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/documents" className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-orange-200">
              <FileClock className="h-4 w-4" />
              Duyệt tài liệu
            </Link>
            <Link href="/admin/users" className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm">
              <Users className="h-4 w-4" />
              Tạo tài khoản
            </Link>
          </div>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Học sinh" value={formatNumber(studentCount)} note={`${formatNumber(teacherCount)} giáo viên`} Icon={GraduationCap} tone="bg-blue-50 text-blue-600" />
          <StatCard label="Đề thi" value={formatNumber(examCount)} note={`${formatNumber(questionCount)} câu hỏi`} Icon={ClipboardList} tone="bg-orange-50 text-orange-600" />
          <StatCard label="Cần duyệt" value={formatNumber(pendingDocumentCount)} note={`${formatNumber(openReportCount)} báo cáo`} Icon={FileClock} tone="bg-amber-50 text-amber-600" />
          <StatCard label="Doanh thu" value={formatCurrency(paidRevenue)} note={`${formatNumber(pendingPaymentCount)} đang chờ`} Icon={ReceiptText} tone="bg-emerald-50 text-emerald-600" />
        </section>

        <section className="mt-7 grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Module quản trị</h2>
                <p className="mt-1 text-sm text-slate-500">Mỗi module dẫn tới trang CRUD hoặc hàng đợi xử lý riêng.</p>
              </div>
              <span className="w-fit rounded-full bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-500">{resourceLinks.length} khu vực</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {resourceLinks.map(({ href, title, description, Icon, tone }) => (
                <Link key={href} href={href} className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-orange-200 hover:bg-orange-50">
                  <div className="flex items-start gap-4">
                    <span className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tone)}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <strong className="text-sm text-slate-950">{title}</strong>
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" />
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Tình trạng hệ thống</h2>
            <div className="mt-5 grid gap-3">
              {systemStatuses.map(({ label, value, Icon: StatusIcon, tone }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                  <span className={clsx("grid h-10 w-10 place-items-center rounded-xl", tone)}>
                    <StatusIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-slate-900">{label}</span>
                    <span className="text-xs text-slate-500">Cập nhật từ database</span>
                  </span>
                  <strong className="text-sm text-slate-700">{systemStatusValues[value]}</strong>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-black text-slate-950">Tài liệu chờ duyệt</h2>
              <Link href="/admin/documents" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-orange-600">
                Xem tất cả
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
              {pendingDocuments.length ? (
                pendingDocuments.map((document) => (
                  <div key={document.id} className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-0 sm:flex-row sm:items-center">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-black text-slate-900">{document.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {document.subject} · {document.grade} · {document.uploader.name ?? document.uploader.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {document.reports.length ? <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-black text-red-600">{document.reports.length} báo cáo</span> : null}
                      <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-500">{formatDate(document.createdAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-8 text-center text-sm font-semibold text-slate-500">Không có tài liệu nào đang chờ duyệt.</p>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Người dùng mới</h2>
            <div className="mt-5 grid gap-3">
              {recentUsers.map((account) => (
                <div key={account.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-orange-500 shadow-sm">
                    {(account.name ?? account.email).slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900">{account.name ?? account.email}</p>
                    <p className="truncate text-xs text-slate-500">{account.email}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">{account.role}</span>
                </div>
              ))}
              {!recentUsers.length ? <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">Chưa có người dùng.</p> : null}
            </div>
          </div>
        </section>

        <section className="mt-7 rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-950">Thanh toán gần đây</h2>
            <Link href="/admin/payments" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-orange-600">
              Quản lý
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="border-b border-slate-100 px-4 py-3">Người dùng</th>
                  <th className="border-b border-slate-100 px-4 py-3">Gói</th>
                  <th className="border-b border-slate-100 px-4 py-3">Số tiền</th>
                  <th className="border-b border-slate-100 px-4 py-3">Trạng thái</th>
                  <th className="border-b border-slate-100 px-4 py-3">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.length ? (
                  recentPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-4 font-bold text-slate-900">{payment.user.name ?? payment.user.email}</td>
                      <td className="px-4 py-4 text-slate-500">{payment.plan.name}</td>
                      <td className="px-4 py-4 font-extrabold text-slate-900">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-4">
                        <span
                          className={clsx(
                            "rounded-full px-3 py-1 text-[11px] font-black",
                            payment.status === "PAID" ? "bg-emerald-50 text-emerald-600" : payment.status === "FAILED" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600",
                          )}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-500">{formatDate(payment.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center font-semibold text-slate-500">
                      Chưa có giao dịch thanh toán.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
