import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminTheoryLessonsPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-16 md:px-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Lý thuyết</p>
        <h1 className="text-3xl font-black text-slate-900">Bài lý thuyết</h1>
        <p className="mt-2 text-sm text-slate-500">Thêm nội dung từng bài vào chương lý thuyết đã tạo.</p>
      </div>
      <AdminResourceManager
        resource="theory-lessons"
        defaultPayload={{
          chapterId: "copy-theory-chapter-id",
          slug: "tinh-don-dieu-va-cuc-tri-cua-ham-so",
          title: "Tính đơn điệu và cực trị của hàm số",
          summary: "Tóm tắt điều kiện xét dấu đạo hàm và cách tìm cực trị.",
          content: "Nội dung lý thuyết nhập tại đây.\n\nCó thể chia nhiều đoạn bằng dòng trống để trang hiển thị dễ đọc.",
          position: 1,
          accessLevel: "FREE",
          isPublished: true,
        }}
      />
    </main>
  );
}
