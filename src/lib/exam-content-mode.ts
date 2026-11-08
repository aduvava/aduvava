/** Which student section should display this exam? Kept separate from ExamType. */
export type ExamContentMode = "TOPIC" | "EXAM";

export const EXAM_CONTENT_MODES: ReadonlyArray<{ value: ExamContentMode; label: string }> = [
  { value: "TOPIC", label: "Theo chuyên đề" },
  { value: "EXAM", label: "Theo kỳ thi" },
];

export function contentModeFromLegacy(
  type: string | null | undefined,
  metadataMode: string | null | undefined,
): ExamContentMode {
  if (metadataMode === "exams") return "EXAM";
  if (metadataMode === "topics" || metadataMode === "theory") return "TOPIC";
  return type === "MOCK" || type === "PREDICTION" ? "EXAM" : "TOPIC";
}

export function typeForContentMode(
  mode: ExamContentMode,
  existingType?: string | null,
): "PRACTICE" | "MOCK" | "PREDICTION" {
  return mode === "TOPIC" ? "PRACTICE" : existingType === "PREDICTION" ? "PREDICTION" : "MOCK";
}
