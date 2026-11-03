import templates from "@/data/national-exam-templates.json";

export type NationalExamPart = {
  key: "part1" | "part2" | "part3";
  label: string;
  questionType: "SINGLE_CHOICE" | "TRUE_FALSE_SET" | "SHORT_ANSWER" | "ESSAY";
  count: number;
  pointsPerQuestion: number;
};

export type NationalExamRule = {
  subjectSlug: string;
  durationMinutes: number;
  parts: NationalExamPart[];
};

// One source of truth shared with the standalone Admin importer.
export const nationalExamRules: Record<string, NationalExamRule> = Object.fromEntries(
  Object.entries(templates).map(([slug, template]) => [
    slug,
    { ...template, subjectSlug: slug } as NationalExamRule,
  ]),
);

export function getNationalExamRule(subjectSlug: string) {
  return nationalExamRules[subjectSlug];
}

export function getNationalQuestionCount(rule: NationalExamRule) {
  return rule.parts.reduce((sum, part) => sum + part.count, 0);
}

export function getQuestionPartLabel(type: string) {
  if (type === "TRUE_FALSE_SET") return "Phần II: Đúng/Sai";
  if (type === "SHORT_ANSWER") return "Phần III: Trả lời ngắn";
  if (type === "ESSAY") return "Phần tự luận";
  return "Phần I: Nhiều lựa chọn";
}
