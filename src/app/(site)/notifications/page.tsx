import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });

  return (
    <div className="mx-auto min-h-[70vh] max-w-4xl px-4 py-12 md:px-6">
      <h1 className="text-4xl font-black text-slate-900">Thông báo</h1>
      <div className="mt-8 space-y-3">
        {notifications.map((item) => (
          <Link key={item.id} href={item.href ?? "/dashboard"} className="block rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
            <h2 className="font-extrabold text-slate-800">{item.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{item.message}</p>
            <p className="mt-2 text-xs text-slate-400">{item.createdAt.toLocaleString("vi-VN")}</p>
          </Link>
        ))}
        {!notifications.length ? <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Bạn chưa có thông báo.</p> : null}
      </div>
    </div>
  );
}
