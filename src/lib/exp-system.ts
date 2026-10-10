import type { ExamType, Prisma } from "@prisma/client";
import type { QuestionScore } from "@/lib/scoring";

const DAY_MS = 86_400_000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

export const EXP_CONFIG = {
  expPerCorrectAnswer: 10,
  dailyCap: 2000,
  perfectBonus: 50,
  speedBonusRate: 0.2,
  repeatRates: [1, 0.5, 0],
  maxStreakMultiplier: 1.5,
};

type ExamStructure = Prisma.JsonValue | null | undefined;

type ExamExpInput = {
  questionScores: QuestionScore[];
  score: number;
  maxScore: number;
  durationSeconds: number;
  durationMinutes: number;
  examType: ExamType;
  examStructure?: ExamStructure;
  previousAttemptCount: number;
  todayEarnedExp: number;
  activityDates: Date[];
  now?: Date;
};

export type ExamExpBreakdown = {
  expReward: number;
  correctCount: number;
  totalQuestions: number;
  scoreRatio: number;
  difficultyMultiplier: number;
  difficultyLabel: "easy" | "medium" | "hard";
  baseExp: number;
  speedBonus: number;
  perfectBonus: number;
  streakDays: number;
  streakMultiplier: number;
  beforeRepeatLimit: number;
  previousAttemptCount: number;
  repeatRate: number;
  afterRepeatLimit: number;
  dailyCap: number;
  todayEarnedBefore: number;
  dailyRemainingBefore: number;
  dailyCapReduction: number;
};

function vietnamDayIndex(date: Date) {
  return Math.floor((date.getTime() + VIETNAM_OFFSET_MS) / DAY_MS);
}

export function getVietnamDayRange(date = new Date()) {
  const dayIndex = vietnamDayIndex(date);
  const start = new Date(dayIndex * DAY_MS - VIETNAM_OFFSET_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

function getObject(value: ExamStructure) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function getExamDifficulty(examType: ExamType, durationMinutes: number, questionCount: number, examStructure?: ExamStructure) {
  const structure = getObject(examStructure);
  const raw = String(structure?.difficulty ?? structure?.doKho ?? "").toLowerCase();

  if (["hard", "kho", "khó", "2"].includes(raw) || examType === "PREDICTION" || durationMinutes >= 75 || questionCount >= 40) {
    return { label: "hard" as const, multiplier: 2 };
  }

  if (["medium", "trungbinh", "trung bình", "1.5"].includes(raw) || examType === "MOCK" || durationMinutes >= 35 || questionCount >= 20) {
    return { label: "medium" as const, multiplier: 1.5 };
  }

  return { label: "easy" as const, multiplier: 1 };
}

function getRepeatRate(previousAttemptCount: number) {
  if (previousAttemptCount <= 0) return EXP_CONFIG.repeatRates[0];
  if (previousAttemptCount === 1) return EXP_CONFIG.repeatRates[1];
  return EXP_CONFIG.repeatRates[2];
}

function getStreakDays(activityDates: Date[], now: Date) {
  const activeDays = new Set(activityDates.map(vietnamDayIndex));
  const today = vietnamDayIndex(now);
  activeDays.add(today);

  let days = 0;
  for (let day = today; activeDays.has(day); day -= 1) days += 1;
  return days;
}

export function calculateExamExp(input: ExamExpInput): ExamExpBreakdown {
  const now = input.now ?? new Date();
  const totalQuestions = input.questionScores.length;
  const correctCount = input.questionScores.filter((item) => item.isCorrect === true || (item.isCorrect === null && item.maxScore > 0 && item.score >= item.maxScore)).length;
  const scoreRatio = input.maxScore > 0 ? input.score / input.maxScore : 0;
  const difficulty = getExamDifficulty(input.examType, input.durationMinutes, totalQuestions, input.examStructure);
  const baseExp = Math.round(correctCount * EXP_CONFIG.expPerCorrectAnswer * difficulty.multiplier);
  const speedBonus = input.durationSeconds <= input.durationMinutes * 60 * 0.5 ? Math.round(baseExp * EXP_CONFIG.speedBonusRate) : 0;
  const perfectBonus = totalQuestions > 0 && correctCount === totalQuestions ? EXP_CONFIG.perfectBonus : 0;
  const streakDays = getStreakDays(input.activityDates, now);
  const streakMultiplier = Math.min(EXP_CONFIG.maxStreakMultiplier, Number((1 + Math.max(0, streakDays - 1) * 0.1).toFixed(1)));
  const beforeRepeatLimit = Math.round((baseExp + speedBonus + perfectBonus) * streakMultiplier);
  const repeatRate = getRepeatRate(input.previousAttemptCount);
  const afterRepeatLimit = Math.round(beforeRepeatLimit * repeatRate);
  const dailyRemainingBefore = Math.max(0, EXP_CONFIG.dailyCap - input.todayEarnedExp);
  const expReward = Math.min(afterRepeatLimit, dailyRemainingBefore);

  return {
    expReward,
    correctCount,
    totalQuestions,
    scoreRatio,
    difficultyMultiplier: difficulty.multiplier,
    difficultyLabel: difficulty.label,
    baseExp,
    speedBonus,
    perfectBonus,
    streakDays,
    streakMultiplier,
    beforeRepeatLimit,
    previousAttemptCount: input.previousAttemptCount,
    repeatRate,
    afterRepeatLimit,
    dailyCap: EXP_CONFIG.dailyCap,
    todayEarnedBefore: input.todayEarnedExp,
    dailyRemainingBefore,
    dailyCapReduction: Math.max(0, afterRepeatLimit - expReward),
  };
}
