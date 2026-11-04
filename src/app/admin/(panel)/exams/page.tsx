import { ExamImportForm } from "@/components/admin/exam-import-form";
export default function AdminExamsPage() {
  return <main className="mx-auto max-w-7xl px-4 py-10 md:px-6"><h1 className="text-3xl font-black">Đề thi</h1><p className="my-4 text-sm text-slate-600">Chọn lớp, môn và tải bảng câu hỏi. Đề mới được lưu dưới dạng bản nháp.</p><ExamImportForm /></main>;
}
