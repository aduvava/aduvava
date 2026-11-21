import data from "@/data/special-exam-templates.json";

export type AssessmentQuestionType = "SINGLE_CHOICE" | "TRUE_FALSE_SET" | "SHORT_ANSWER" | "ESSAY";
export type AssessmentBlock = {
  key: string;
  label: string;
  count: number;
  questionType: AssessmentQuestionType;
  allowedTypes?: AssessmentQuestionType[];
  pointsPerQuestion: number;
  requiredShortAnswers?: number;
};
export type AssessmentPart = {
  key: string;
  label: string;
  durationMinutes: number | null;
  requiredShortAnswers?: number;
  blocks: AssessmentBlock[];
};
export type AssessmentVariant = { id: string; label: string; parts: AssessmentPart[] };
export type AssessmentRule = {
  label: string;
  durationMinutes: number;
  maxPoints: number;
  scoreMode: "RAW" | "IRT" | "ESSAY_PENDING";
  source: string;
  variants: AssessmentVariant[];
};
const templates = data as unknown as Record<string, AssessmentRule>;

export function getAssessmentRule(track: string | null | undefined): AssessmentRule | null {
  return track ? templates[track] ?? null : null;
}
export function getAssessmentVariant(track: string | null | undefined, variantId?: string | null): AssessmentVariant | null {
  const spec = getAssessmentRule(track);
  return spec?.variants.find((variant) => variant.id === variantId) ?? spec?.variants[0] ?? null;
}
export function assessmentQuestionCount(variant: AssessmentVariant): number {
  return variant.parts.reduce((total, section) => total + section.blocks.reduce((sum, block) => sum + block.count, 0), 0);
}
export function assessmentObjectiveMax(variant: AssessmentVariant): number {
  return variant.parts.reduce((total, part) => total + part.blocks.reduce((sum, block) =>
    sum + (block.questionType === "ESSAY" ? 0 : block.count * block.pointsPerQuestion), 0), 0);
}
export function flattenAssessmentBlocks(variant: AssessmentVariant) {
  let offset = 0;
  return variant.parts.flatMap((part) =>
    part.blocks.map((block) => {
      const start = offset + 1;
      offset += block.count;
      return { ...block, sectionKey: part.key, sectionLabel: part.label, durationMinutes: part.durationMinutes, start, end: offset };
    }),
  );
}
export function getAssessmentBlock(variant: AssessmentVariant, position: number) {
  return flattenAssessmentBlocks(variant).find((block) => position >= block.start && position <= block.end);
}
