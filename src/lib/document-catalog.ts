export const documentCatalog = [
  {
    id: "THCS",
    label: "Trung học cơ sở",
    grades: ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"],
    subjects: [
      "Toán",
      "Ngữ Văn",
      "Tiếng Anh",
      "Lịch Sử",
      "Địa Lý",
      "KHTN (Sinh Học)",
      "KHTN (Vật Lý)",
      "KHTN (Hóa Học)",
      "Công Nghệ",
    ],
  },
  {
    id: "THPT",
    label: "Trung học phổ thông",
    grades: ["Lớp 10", "Lớp 11", "Lớp 12"],
    subjects: [
      "Toán",
      "Ngữ Văn",
      "Tiếng Anh",
      "Lịch Sử",
      "Địa Lý",
      "Sinh Học",
      "Vật Lý",
      "Hóa Học",
      "KT&PL",
      "Công nghệ Nông nghiệp",
      "Công nghệ Công nghiệp",
    ],
  },
  {
    id: "EXAM_10",
    label: "Ôn thi vào 10",
    grades: ["Môn thi"],
    subjects: ["Toán", "Ngữ Văn", "Tiếng Anh"],
  },
  {
    id: "THPTQG",
    label: "Ôn thi THPTQG",
    grades: ["Môn thi"],
    subjects: [
      "Toán",
      "Ngữ Văn",
      "Tiếng Anh",
      "Lịch Sử",
      "Địa Lý",
      "Sinh Học",
      "Vật Lý",
      "Hóa Học",
      "KT&PL",
      "Công nghệ Nông nghiệp",
      "Công nghệ Công nghiệp",
    ],
  },
] as const;

export const documentTypes = [
  { id: "MOCK_EXAM", label: "Đề thi thử" },
  { id: "THEORY_SUMMARY", label: "Tóm tắt lý thuyết" },
  { id: "FORMULA_HANDBOOK", label: "Sổ tay công thức" },
  { id: "FINAL_REVIEW", label: "Đề cương ôn tập cuối kỳ" },
] as const;

export type DocumentLevel = (typeof documentCatalog)[number]["id"];
export type DocumentTypeId = (typeof documentTypes)[number]["id"];
