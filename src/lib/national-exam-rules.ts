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

const threePartScience = (subjectSlug: string): NationalExamRule => ({
  subjectSlug,
  durationMinutes: 50,
  parts: [
    { key: "part1", label: "Phần I: Nhiều lựa chọn", questionType: "SINGLE_CHOICE", count: 18, pointsPerQuestion: 0.25 },
    { key: "part2", label: "Phần II: Đúng/Sai", questionType: "TRUE_FALSE_SET", count: 4, pointsPerQuestion: 1 },
    { key: "part3", label: "Phần III: Trả lời ngắn", questionType: "SHORT_ANSWER", count: 6, pointsPerQuestion: 0.25 },
  ],
});

const twoPartSocial = (subjectSlug: string): NationalExamRule => ({
  subjectSlug,
  durationMinutes: 50,
  parts: [
    { key: "part1", label: "Phần I: Nhiều lựa chọn", questionType: "SINGLE_CHOICE", count: 24, pointsPerQuestion: 0.25 },
    { key: "part2", label: "Phần II: Đúng/Sai", questionType: "TRUE_FALSE_SET", count: 4, pointsPerQuestion: 1 },
    { key: "part3", label: "Phần III: Trả lời ngắn", questionType: "SHORT_ANSWER", count: 0, pointsPerQuestion: 0.25 },
  ],
});

export const nationalExamRules: Record<string, NationalExamRule> = {
  toan: {
    subjectSlug: "toan",
    durationMinutes: 90,
    parts: [
      { key: "part1", label: "Phần I: Nhiều lựa chọn", questionType: "SINGLE_CHOICE", count: 12, pointsPerQuestion: 0.25 },
      { key: "part2", label: "Phần II: Đúng/Sai", questionType: "TRUE_FALSE_SET", count: 4, pointsPerQuestion: 1 },
      { key: "part3", label: "Phần III: Trả lời ngắn", questionType: "SHORT_ANSWER", count: 6, pointsPerQuestion: 0.5 },
    ],
  },
  "vat-ly": threePartScience("vat-ly"),
  "hoa-hoc": threePartScience("hoa-hoc"),
  "sinh-hoc": threePartScience("sinh-hoc"),
  "dia-ly": threePartScience("dia-ly"),
  "lich-su": twoPartSocial("lich-su"),
  "kt-va-phap-luat": twoPartSocial("kt-va-phap-luat"),
  "cong-nghe-cong-nghiep": twoPartSocial("cong-nghe-cong-nghiep"),
  "cong-nghe-nong-nghiep": twoPartSocial("cong-nghe-nong-nghiep"),
  "tieng-anh": {
    subjectSlug: "tieng-anh",
    durationMinutes: 50,
    parts: [
      { key: "part1", label: "Phần I: Nhiều lựa chọn", questionType: "SINGLE_CHOICE", count: 40, pointsPerQuestion: 0.25 },
      { key: "part2", label: "Phần II: Đúng/Sai", questionType: "TRUE_FALSE_SET", count: 0, pointsPerQuestion: 1 },
      { key: "part3", label: "Phần III: Trả lời ngắn", questionType: "SHORT_ANSWER", count: 0, pointsPerQuestion: 0.25 },
    ],
  },
  "ngu-van": {
    subjectSlug: "ngu-van",
    durationMinutes: 120,
    parts: [
      { key: "part1", label: "Phần I: Đọc hiểu", questionType: "ESSAY", count: 1, pointsPerQuestion: 4 },
      { key: "part2", label: "Phần II: Viết", questionType: "ESSAY", count: 1, pointsPerQuestion: 6 },
      { key: "part3", label: "Phần III", questionType: "SHORT_ANSWER", count: 0, pointsPerQuestion: 0 },
    ],
  },
};

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
