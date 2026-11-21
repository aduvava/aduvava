import { ExamManager } from "@/components/admin/exam-manager";
import Link from "next/link";

export default function AdminExamsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="font-display text-3xl font-black text-ink sm:text-4xl">Quản lý đề thi</h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">
        Tìm, chỉnh sửa, ẩn hoặc xóa đề đã tải lên. Xóa vĩnh viễn đề có lượt làm sẽ xóa cả lịch sử và kết quả học viên.
        Đề THPTQG và các kỳ thi ĐGNL phải có cấu trúc, tổ hợp và điểm hợp lệ trước khi xuất bản.
      </p>
      <Link href="/admin/dgnl-import" className="mt-5 mr-3 inline-flex rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">Nhập đề ĐGNL đúng cấu trúc</Link>
      <Link href="/admin/dgnl-bca-grading" className="mt-5 inline-flex rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">Chấm tự luận ĐGNL BCA (25 điểm)</Link>
      <div className="mt-6"><ExamManager /></div>
    </main>
  );
}
