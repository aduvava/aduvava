import { assessmentQuestionCount, getAssessmentVariant } from "@/lib/special-exam-rules";

type SectionAttempt = {
  startedAt: Date;
  mode: string;
  extraTimeSeconds: number;
  exam: { specialExamTrack?: string | null; examStructure?: unknown };
};
export type TimedSection = {
  key: string;
  label: string;
  start: number;
  end: number;
  durationMinutes: number;
};
export function getTimedExamSections(exam: SectionAttempt["exam"]): TimedSection[] {
  const structure = exam.examStructure;
  const record = structure && typeof structure === "object" && !Array.isArray(structure)
    ? structure as Record<string, unknown> : null;
  const variantId = typeof record?.variantId === "string" ? record.variantId : null;
  if (!variantId || !["HSA", "QDA", "TSA"].includes(exam.specialExamTrack ?? "")) return [];
  const variant = getAssessmentVariant(exam.specialExamTrack, variantId);
  if (!variant || variant.parts.some((part) => !part.durationMinutes || part.durationMinutes <= 0)) return [];
  let next = 1;
  const sections = variant.parts.map((part) => {
    const count = part.blocks.reduce((sum, block) => sum + block.count, 0);
    const current = { key: part.key, label: part.label, start: next, end: next + count - 1, durationMinutes: part.durationMinutes! };
    next += count;
    return current;
  });
  return next - 1 === assessmentQuestionCount(variant) ? sections : [];
}
export function activeTimedExamSection(attempt: SectionAttempt, now: Date = new Date()) {
  if (attempt.mode !== "MOCK") return null;
  const sections = getTimedExamSections(attempt.exam);
  if (!sections.length) return null;
  const elapsed = Math.max(0, Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000));
  let cumulative = 0;
  for (const [index, section] of sections.entries()) {
    cumulative += section.durationMinutes * 60;
    if (elapsed < cumulative || (index === sections.length - 1 && attempt.extraTimeSeconds > 0)) {
      return { ...section, index, remainingSeconds: Math.max(0, cumulative - elapsed) };
    }
  }
  return null;
}
