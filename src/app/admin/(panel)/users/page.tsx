import { AdminCatalogManager } from "@/components/admin/admin-catalog-manager";
import { requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/db";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export default async function AdminUsersPage() {
  await requireAdmin();

  const profiles = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      profile: {
        select: {
          grade: true,
          school: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const completedProfiles = profiles.filter((user) => user.profile && user.profile.grade && user.profile.school);
  const gradeStats = completedProfiles.reduce<Record<string, number>>((stats, user) => {
    const grade = user.profile?.grade?.trim() || "Chưa nhập lớp";
    stats[grade] = (stats[grade] ?? 0) + 1;
    return stats;
  }, {});

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">Quản trị Educhi</p>
      <h1 className="mt-3 text-4xl font-black text-slate-950">Admin · Người dùng</h1>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-extrabold text-slate-500">Tổng học sinh</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{profiles.length}</p>
        </article>
        <article className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-extrabold text-slate-500">Đã điền hồ sơ</p>
          <p className="mt-2 text-3xl font-black text-orange-600">{completedProfiles.length}</p>
        </article>
        <article className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-extrabold text-slate-500">Tỉ lệ hoàn thiện</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{profiles.length ? Math.round((completedProfiles.length / profiles.length) * 100) : 0}%</p>
        </article>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Thống kê thông tin cá nhân</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Dữ liệu lấy từ form trong menu avatar của học sinh.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(gradeStats).map(([grade, count]) => (
              <span key={grade} className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-600">
                {grade}: {count}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Học sinh</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Lớp</th>
                <th className="px-4 py-3">Trường</th>
                <th className="px-4 py-3">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((user) => (
                <tr key={user.id} className="align-top">
                  <td className="px-4 py-4 font-black text-slate-900">{user.name ?? "Chưa đặt tên"}</td>
                  <td className="px-4 py-4 text-slate-500">{user.email}</td>
                  <td className="px-4 py-4 font-semibold text-slate-700">{user.profile?.grade || "-"}</td>
                  <td className="px-4 py-4 text-slate-600">{user.profile?.school || "-"}</td>
                  <td className="px-4 py-4 text-slate-500">{user.profile?.updatedAt ? formatDate(user.profile.updatedAt) : "-"}</td>
                </tr>
              ))}
              {!profiles.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center font-semibold text-slate-500">
                    Chưa có học sinh nào.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-8">
        <AdminCatalogManager resource="users" />
      </div>
    </main>
  );
}
