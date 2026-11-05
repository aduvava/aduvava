import { TheoryLessonManager } from "@/components/admin/theory-manager";

export default function AdminTheoryLessonsPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Quản lý lý thuyết</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Bài lý thuyết</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">Chọn lớp → môn → chương, đặt tên bài và nhập nội dung hoặc tải PDF/DOCX.</p>
      </div>
      <TheoryLessonManager />
    </main>
  );
}
