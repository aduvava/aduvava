import {
  Atom, BookMarked, BookOpenText, Calculator, Cog, Dna, Earth,
  Gavel, GraduationCap, Languages, Landmark, Laptop, Leaf,
} from "lucide-react";

type SubjectVisual = {
  icon: typeof Calculator;
  imageSrc?: string;
  className: string;
};

const subjectVisuals = {
  "Toán": {
    icon: Calculator,
    imageSrc: "/subject-images/toan.png",
    className: "from-orange-50 to-amber-50 text-orange-600",
  },
  "Ngữ Văn": {
    icon: BookOpenText,
    imageSrc: "/subject-images/ngu-van.png",
    className: "from-rose-50 to-orange-50 text-rose-600",
  },
  "Tiếng Anh": {
    icon: Languages,
    imageSrc: "/subject-images/tieng-anh.png",
    className: "from-sky-50 to-blue-50 text-blue-600",
  },
  "Lịch Sử": {
    icon: Landmark,
    imageSrc: "/subject-images/lich-su.png",
    className: "from-amber-50 to-yellow-50 text-amber-700",
  },
  "Địa Lý": {
    icon: Earth,
    imageSrc: "/subject-images/dia-ly.png",
    className: "from-emerald-50 to-cyan-50 text-emerald-600",
  },
  "Sinh Học": {
    icon: Dna,
    imageSrc: "/subject-images/sinh-hoc.png",
    className: "from-green-50 to-lime-50 text-green-600",
  },
  "Vật Lý": {
    icon: Atom,
    imageSrc: "/subject-images/vat-ly.png",
    className: "from-sky-50 to-blue-50 text-sky-600",
  },
  "Hóa Học": {
    icon: BookMarked,
    imageSrc: "/subject-images/hoa-hoc.png",
    className: "from-emerald-50 to-lime-50 text-emerald-600",
  },
  "KHTN (Sinh Học)": {
    icon: Dna,
    imageSrc: "/subject-images/sinh-hoc.png",
    className: "from-green-50 to-lime-50 text-green-600",
  },
  "KHTN (Vật Lý)": {
    icon: Atom,
    imageSrc: "/subject-images/vat-ly.png",
    className: "from-sky-50 to-blue-50 text-sky-600",
  },
  "KHTN (Hóa Học)": {
    icon: BookMarked,
    imageSrc: "/subject-images/hoa-hoc.png",
    className: "from-emerald-50 to-lime-50 text-emerald-600",
  },
  "Giáo dục công dân": {
    icon: Gavel,
    imageSrc: "/subject-images/kt-va-phap-luat.png",
    className: "from-amber-50 to-orange-50 text-amber-700",
  },
  "Tin học": {
    icon: Laptop,
    imageSrc: "/subject-images/tin-hoc.webp",
    className: "from-blue-50 to-cyan-50 text-blue-600",
  },
  "KT&PL": {
    icon: Gavel,
    imageSrc: "/subject-images/kt-va-phap-luat.png",
    className: "from-amber-50 to-orange-50 text-amber-700",
  },
  "Công Nghệ": {
    icon: Cog,
    imageSrc: "/subject-images/cong-nghe-nong-nghiep.png",
    className: "from-lime-50 to-emerald-50 text-emerald-600",
  },
  "Công nghệ Nông nghiệp": {
    icon: Leaf,
    imageSrc: "/subject-images/cong-nghe-nong-nghiep.png",
    className: "from-lime-50 to-green-50 text-lime-700",
  },
  "Công nghệ Công nghiệp": {
    icon: Cog,
    imageSrc: "/subject-images/cong-nghe-cong-nghiep.webp",
    className: "from-orange-100 to-amber-50 text-orange-600",
  },
} satisfies Record<string, SubjectVisual>;

export function getItemVisual(item: string, slug: string): SubjectVisual {
  if (item in subjectVisuals) return subjectVisuals[item as keyof typeof subjectVisuals];

  // Subject names in the database may use different case, accents or spelling.
  // Reuse the existing illustrations rather than dropping back to plain icons.
  const normalized = (item + " " + slug)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d");

  const aliases: [RegExp, keyof typeof subjectVisuals][] = [
    [/toan/, "Toán"],
    [/ngu[ -]?van|van[ -]?hoc/, "Ngữ Văn"],
    [/tieng[ -]?anh|english/, "Tiếng Anh"],
    [/lich[ -]?su/, "Lịch Sử"],
    [/dia[ -]?ly/, "Địa Lý"],
    [/vat[ -]?ly|vat[ -]?li/, "Vật Lý"],
    [/hoa[ -]?hoc/, "Hóa Học"],
    [/sinh[ -]?hoc|sinh[ -]?vat/, "Sinh Học"],
    [/khoa[ -]?hoc[ -]?tu[ -]?nhien|khtn/, "KHTN (Sinh Học)"],
    [/kinh[ -]?te|phap[ -]?luat|giao[ -]?duc[ -]?cong[ -]?dan|gdcd/, "KT&PL"],
    [/tin[ -]?hoc/, "Tin học"],
    [/cong[ -]?nghe[ -]?cong[ -]?nghiep/, "Công nghệ Công nghiệp"],
    [/cong[ -]?nghe/, "Công Nghệ"],
  ];
  const match = aliases.find(([pattern]) => pattern.test(normalized));
  if (match) return subjectVisuals[match[1]];

  return { icon: GraduationCap, imageSrc: undefined, className: "from-orange-100 to-amber-50 text-orange-600" };
}
