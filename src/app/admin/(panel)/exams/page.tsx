import { ExamManager } from "@/components/admin/exam-manager";

export default function AdminExamsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="font-display text-3xl font-black text-ink sm:text-4xl">Quản lý đề thi</h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">
        Tìm, chỉnh sửa, ẩn hoặc xóa đề đã tải lên. Xóa vĩnh viễn đề có lượt làm sẽ xóa cả lịch sử và kết quả học viên.
        Đề THPTQG chính thức phải có cấu trúc hợp lệ trước khi xuất bản.
      </p>
      <div className="mt-6"><ExamManager /></div>
    </main>
  );
}
