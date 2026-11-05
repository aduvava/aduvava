type SubjectForDashboard = { slug: string; name: string };

// THCS has a separate curriculum. Keep the database slug (and therefore the
// existing lessons/exams), but show the correct subject name for this level.
const secondaryCatalog: ReadonlyArray<{ name: string; aliases: readonly string[] }> = [
  { name: "Công nghệ", aliases: ["cong nghe", "cong nghe nong nghiep", "cong nghe cong nghiep"] },
  { name: "Hóa học", aliases: ["hoa hoc"] },
  { name: "Lịch sử", aliases: ["lich su"] },
  { name: "Địa lý", aliases: ["dia ly", "dia li"] },
  { name: "Ngữ văn", aliases: ["ngu van", "van hoc"] },
  { name: "Sinh học", aliases: ["sinh hoc"] },
  { name: "Tin học", aliases: ["tin hoc"] },
  { name: "Tiếng Anh", aliases: ["tieng anh", "anh van", "english"] },
  { name: "Toán", aliases: ["toan", "toan hoc"] },
  { name: "Vật lý", aliases: ["vat ly", "vat li"] },
  {
    name: "Giáo dục công dân",
    aliases: [
      "giao duc cong dan", "gdcd", "kinh te va phap luat", "kt pl",
      "kt va pl", "giao duc kinh te va phap luat", "gdkt pl",
    ],
  },
];

function normalizeName(name: string): string {
  return name.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getDashboardSubjects<T extends SubjectForDashboard>(
  subjects: readonly T[],
  group: string,
): Array<T & { name: string }> {
  if (group !== "secondary") return subjects.map((subject) => ({ ...subject }));

  // Only real database subjects may be linked. Never create cards pointing at
  // nonexistent slugs. Prefer the exact THCS name over a legacy alias.
  return secondaryCatalog.flatMap(({ name, aliases }) => {
    const matching = aliases
      .map((alias) => subjects.find((subject) =>
        normalizeName(subject.name) === alias || normalizeName(subject.slug) === alias))
      .find((subject) => subject !== undefined);
    return matching ? [{ ...matching, name }] : [];
  });
}

export const secondarySubjectCount = secondaryCatalog.length;
