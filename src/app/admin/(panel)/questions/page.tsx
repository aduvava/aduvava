import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminQuestionsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-black text-ink">Admin · Câu hỏi</h1>
      <div className="mt-8">
        <AdminResourceManager
          resource="questions"
          defaultPayload={{
            examId: "copy-exam-id",
            position: 1,
            type: "SINGLE_CHOICE",
            prompt: "Câu hỏi mới?",
            points: 1,
            explanation: "Giải thích ngắn",
            answerOptions: [
              { label: "A", content: "Đáp án A", isCorrect: true },
              { label: "B", content: "Đáp án B", isCorrect: false },
            ],
          }}
        />
      </div>
    </main>
  );
}
