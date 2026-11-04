import { TheoryUploadForm } from "@/components/admin/theory-upload-form";
export default function AdminTheoryChaptersPage() {
  return <main className="mx-auto max-w-7xl px-4 py-10 md:px-6"><h1 className="text-3xl font-black">Chương lý thuyết</h1><p className="my-5 text-sm text-slate-600">Chọn lớp, môn và tải file PDF hoặc Word để tạo chương lý thuyết hiển thị trong môn học.</p><TheoryUploadForm /></main>;
}
