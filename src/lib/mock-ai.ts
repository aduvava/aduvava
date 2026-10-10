export type EssayFeedbackInput = {
  prompt: string;
  answer: string;
  rubric?: string;
};

export async function createMockEssayFeedback(input: EssayFeedbackInput) {
  const wordCount = input.answer.trim().split(/\s+/).filter(Boolean).length;
  const coverage = Math.min(10, Math.max(4, Math.round(wordCount / 18)));

  return {
    provider: "mock-ai",
    score: coverage,
    maxScore: 10,
    strengths: ["Có bố cục trả lời rõ", "Bám được trọng tâm câu hỏi"],
    improvements: ["Bổ sung dẫn chứng cụ thể hơn", "Kết luận nên nêu lại luận điểm chính"],
    comment: "Đây là phản hồi mock để kiểm thử luồng AI. Có thể thay provider thật mà không đổi API client.",
    rubric: input.rubric ?? "general"
  };
}
