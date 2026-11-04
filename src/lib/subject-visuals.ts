import catalog from "@/data/subject-catalog.json";

export function subjectImage(slug: string, name = ""): string | null {
  const exact = catalog.find((subject) => subject.slug === slug);
  if (exact) return exact.image;
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = normalize(name);
  return catalog.find((subject) => normalize(subject.name) === key)?.image ?? null;
}
