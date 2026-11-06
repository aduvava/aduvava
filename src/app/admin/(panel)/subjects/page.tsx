import { AdminCatalogManager } from "@/components/admin/admin-catalog-manager";

export default function AdminSubjectsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="font-display text-3xl font-black text-ink sm:text-4xl">Quản lý môn học</h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">
        Thêm hoặc chỉnh tên, biểu tượng, màu sắc, mô tả và đường dẫn. Không xóa môn đang có đề thi hay bài học để bảo vệ dữ liệu.
      </p>
      <div className="mt-6"><AdminCatalogManager resource="subjects" /></div>
    </main>
  );
}
