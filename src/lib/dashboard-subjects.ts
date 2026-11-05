type SubjectForDashboard = { slug: string; name: string };

type CatalogEntry = { name: string; aliases: readonly string[] };

// Catalogs affect navigation/labels only. Keep real database slugs and do not
// create links to a subject that has not yet been added by an administrator.
const secondaryCatalog: readonly CatalogEntry[] = [
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
      "giao duc cong dan", "gdcd", "kinh te va phap luat",
      "kt pl", "kt va pl", "ktpl", "kinh te phap luat",
      "giao duc kinh te va phap luat", "gdkt pl",
    ],
  },
];

const highSchoolCatalog: readonly CatalogEntry[] = [
  { name: "Toán", aliases: ["toan", "toan hoc"] },
  { name: "Ngữ văn", aliases: ["ngu van", "van hoc"] },
  { name: "Tiếng Anh", aliases: ["tieng anh", "anh van", "english"] },
  { name: "Địa lý", aliases: ["dia ly", "dia li"] },
  { name: "Lịch sử", aliases: ["lich su"] },
  { name: "Hóa học", aliases: ["hoa hoc"] },
  { name: "Sinh học", aliases: ["sinh hoc"] },
  { name: "Vật lý", aliases: ["vat ly", "vat li"] },
  {
    name: "KT&PL",
    aliases: [
      "kt pl", "kt va pl", "ktpl", "kinh te va phap luat",
      "kinh te phap luat", "giao duc kinh te va phap luat", "gdkt pl",
    ],
  },
  { name: "Công nghệ Công nghiệp", aliases: ["cong nghe cong nghiep"] },
  { name: "Công nghệ Nông nghiệp", aliases: ["cong nghe nong nghiep"] },
  { name: "Tin học", aliases: ["tin hoc"] },
];

const entranceExamCatalog = highSchoolCatalog.filter((entry) =>
  ["Toán", "Ngữ văn", "Tiếng Anh"].includes(entry.name),
);

const catalogs: Readonly<Record<string, readonly CatalogEntry[]>> = {
  secondary: secondaryCatalog,
  "high-school": highSchoolCatalog,
  "grade-10": entranceExamCatalog,
  "national-exam": highSchoolCatalog,
};

function normalizeName(name: string): string {
  return name.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getSubjectCatalogSize(group: string): number {
  return catalogs[group]?.length ?? 0;
}

export function getDashboardSubjects<T extends SubjectForDashboard>(
  subjects: readonly T[],
  group: string,
): Array<T & { name: string }> {
  const catalog = catalogs[group];
  if (!catalog) return subjects.map((subject) => ({ ...subject }));

  // Prefer the level-specific subject over a legacy alias (e.g. GDCD before
  // KT&PL for THCS). Avoid duplicates and broken links for missing DB entries.
  return catalog.flatMap(({ name, aliases }) => {
    const match = aliases
      .map((alias) => subjects.find((subject) =>
        normalizeName(subject.name) === alias || normalizeName(subject.slug) === alias))
      .find((subject) => subject !== undefined);
    return match ? [{ ...match, name }] : [];
  });
}

export const secondarySubjectCount = secondaryCatalog.length;
