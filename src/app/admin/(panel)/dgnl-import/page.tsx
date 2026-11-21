import Link from "next/link";
import { SpecialExamImport } from "@/components/admin/special-exam-import";

export default function SpecialExamImportPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/admin/exams" className="text-sm font-black text-orange-600">Quay lại Quản lý đề thi</Link>
      <h1 className="mt-4 text-3xl font-black text-slate-950">Nhập đề HSA · TSA · V-ACT · QDA · BCA</h1>
      <p className="mt-3 mb-6 text-sm leading-7 text-slate-600">
        Hệ thống tự đối chiếu số câu, thứ tự các phần, trọng số và thời gian của từng kỳ thi.
        Đề được lưu ở trạng thái nháp; Admin xem lại đáp án và hình minh họa trước khi xuất bản.
        Bộ cấu trúc hiện dựa trên thông tin công bố năm 2026.
      </p>
      <SpecialExamImport />
    </main>
  );
}
