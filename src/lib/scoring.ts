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

/**
 * Accept mathematically equivalent numeric entries (e.g. -3/4 and -0,75)
 * in QDA/HSA only. Do not loosen free-text answers on unrelated exams.
 */
function parseNumericAnswer(raw: unknown): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const input = String(raw).trim().replace(/\s+/g, "").replace(",", ".");
  if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(input)) {
    const value = Number(input);
    return Number.isFinite(value) ? value : null;
  }
  if (/^[+-]?\d+\/\d+$/.test(input)) {
    const [num, denom] = input.split("/").map(Number);
    const value = num / denom;
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

export type ScoringPolicy = { specialExamTrack?: string | null };
export function scoreQuestion(question: ScoringQuestion, value: unknown, policy: ScoringPolicy = {}): QuestionScore {
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
    // The four-statement partial-credit table applies to THPTQG, NOT TSA.
    // In assessment mock papers, a grouped answer is correct only if every
    // statement is correct; never inflate the practice result with THPTQG rules.
    const ratio = policy.specialExamTrack ? (correctCount === total ? 1 : 0)
      : total === 4 ? nationalScale[correctCount] : correctCount / total;
    const score = Number((ratio * question.points).toFixed(2));
    return { questionId: question.id, isCorrect: correctCount === total, score, maxScore: question.points };
  }

  if (question.type === "SHORT_ANSWER") {
    const plainMatch = normalizeText(value) === normalizeText(question.correctText);
    const numeric = policy.specialExamTrack === "QDA" || policy.specialExamTrack === "HSA";
    const candidate = numeric ? parseNumericAnswer(value) : null;
    const expected = numeric ? parseNumericAnswer(question.correctText) : null;
    const isCorrect = plainMatch || (candidate !== null && expected !== null && Math.abs(candidate - expected) < 1e-9);
    return { questionId: question.id, isCorrect, score: isCorrect ? question.points : 0, maxScore: question.points };
  }

  return { questionId: question.id, isCorrect: null, score: 0, maxScore: question.points };
}

export function scoreExam(questions: ScoringQuestion[], answers: ScoringAnswer[], policy: ScoringPolicy = {}) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.value]));
  const questionScores = questions.map((question) => scoreQuestion(question, answerMap.get(question.id), policy));
  const score = Number(questionScores.reduce((sum, item) => sum + item.score, 0).toFixed(2));
  const maxScore = Number(questionScores.reduce((sum, item) => sum + item.maxScore, 0).toFixed(2));

  return { score, maxScore, questionScores };
}
