import { QuestionManager } from "@/components/admin/question-manager";

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<{ examId?: string }> }) {
  const { examId } = await searchParams;
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="font-display text-3xl font-black text-ink sm:text-4xl">Quản lý câu hỏi</h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">
        Chọn đề thi để sửa nội dung, đáp án, lời giải, điểm hoặc xóa câu.
        Với đề THPTQG chính thức đã xuất bản, hãy chuyển về bản nháp trước khi thay đổi câu hỏi.
      </p>
      <div className="mt-6"><QuestionManager initialExamId={examId ?? ""} /></div>
    </main>
  );
}
