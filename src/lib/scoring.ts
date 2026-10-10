export type QuestionType = "SINGLE_CHOICE" | "TRUE_FALSE_SET" | "SHORT_ANSWER" | "ESSAY";

export type ScoringOption = {
  id: string;
  label?: string;
  content?: string;
  isCorrect: boolean;
};

export type ScoringQuestion = {
  id: string;
  type: QuestionType;
  points: number;
  correctText?: string | null;
  topic?: { id: string; name: string } | null;
  answerOptions: ScoringOption[];
};

export type ScoringAnswer = {
  questionId: string;
  value: unknown;
};

export type QuestionScore = {
  questionId: string;
  isCorrect: boolean | null;
  score: number;
  maxScore: number;
};

export function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

export function scoreQuestion(question: ScoringQuestion, value: unknown): QuestionScore {
  if (question.type === "SINGLE_CHOICE") {
    const correct = question.answerOptions.find((option) => option.isCorrect);
    const isCorrect = Boolean(correct && value === correct.id);
    return { questionId: question.id, isCorrect, score: isCorrect ? question.points : 0, maxScore: question.points };
  }

  if (question.type === "TRUE_FALSE_SET") {
    const selections = typeof value === "object" && value !== null ? (value as Record<string, boolean>) : {};
    const total = question.answerOptions.length || 1;
    const correctCount = question.answerOptions.filter((option) => selections[option.id] === option.isCorrect).length;
    const nationalScale = [0, 0.1, 0.25, 0.5, 1];
    const ratio = total === 4 ? nationalScale[correctCount] : correctCount / total;
    const score = Number((ratio * question.points).toFixed(2));
    return { questionId: question.id, isCorrect: correctCount === total, score, maxScore: question.points };
  }

  if (question.type === "SHORT_ANSWER") {
    const isCorrect = normalizeText(value) === normalizeText(question.correctText);
    return { questionId: question.id, isCorrect, score: isCorrect ? question.points : 0, maxScore: question.points };
  }

  return { questionId: question.id, isCorrect: null, score: 0, maxScore: question.points };
}

export function scoreExam(questions: ScoringQuestion[], answers: ScoringAnswer[]) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.value]));
  const questionScores = questions.map((question) => scoreQuestion(question, answerMap.get(question.id)));
  const score = Number(questionScores.reduce((sum, item) => sum + item.score, 0).toFixed(2));
  const maxScore = Number(questionScores.reduce((sum, item) => sum + item.maxScore, 0).toFixed(2));

  return { score, maxScore, questionScores };
}
