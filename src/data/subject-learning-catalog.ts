export type LearningUnit = {
  title: string;
  lessons: string[];
};

export type SubjectLearningItem = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  accent: string;
  icon: string;
  lessonCount: number;
  examCount: number;
  aliases: string[];
  units: LearningUnit[];
  sampleQuestion: {
    prompt: string;
    answers: [string, string, string, string];
    correctIndex: number;
    explanation: string;
  };
};

const biologyUnits: LearningUnit[] = [
  { title: "Tế bào và cơ thể sống", lessons: ["Cấu trúc và chức năng của tế bào", "Trao đổi chất và chuyển hóa năng lượng", "Phân bào và sinh trưởng"] },
  { title: "Di truyền và tiến hóa", lessons: ["Quy luật di truyền cơ bản", "DNA, gene và biến dị", "Chọn lọc tự nhiên và tiến hóa"] },
];

const physicsUnits: LearningUnit[] = [
  { title: "Cơ học và chuyển động", lessons: ["Chuyển động thẳng", "Lực và các định luật Newton", "Công, năng lượng và công suất"] },
  { title: "Điện, từ và sóng", lessons: ["Dòng điện và mạch điện", "Từ trường và cảm ứng điện từ", "Dao động và sóng"] },
];

const chemistryUnits: LearningUnit[] = [
  { title: "Cấu tạo chất và phản ứng", lessons: ["Nguyên tử và bảng tuần hoàn", "Liên kết hóa học", "Tốc độ và cân bằng phản ứng"] },
  { title: "Hóa học vô cơ và hữu cơ", lessons: ["Acid, base và pH", "Kim loại và hợp chất", "Hydrocarbon và dẫn xuất"] },
];

export const subjectLearningCatalog: SubjectLearningItem[] = [
  {
    slug: "toan",
    name: "Toán",
    shortName: "Toán",
    description: "Luyện tư duy, công thức và kỹ năng giải nhanh theo từng chuyên đề.",
    color: "#2563eb",
    accent: "from-blue-500 to-cyan-400",
    icon: "calculator",
    lessonCount: 45,
    examCount: 12,
    aliases: ["Toán"],
    units: [
      { title: "Hàm số và ứng dụng đạo hàm", lessons: ["Tính đơn điệu và cực trị của hàm số", "Tiệm cận và khảo sát đồ thị", "Bài toán tối ưu thực tế"] },
      { title: "Hình học và xác suất", lessons: ["Vector và tọa độ trong không gian", "Thể tích khối đa diện", "Xác suất có điều kiện"] },
    ],
    sampleQuestion: {
      prompt: "Hàm số y = x² đồng biến trên khoảng nào?",
      answers: ["(-∞; 0)", "(0; +∞)", "R", "Không có khoảng nào"],
      correctIndex: 1,
      explanation: "Đạo hàm y' = 2x dương khi x > 0.",
    },
  },
  {
    slug: "ngu-van",
    name: "Ngữ Văn",
    shortName: "Ngữ Văn",
    description: "Đọc hiểu, nghị luận và hệ thống tác phẩm theo hướng rõ ý, đúng cấu trúc.",
    color: "#e11d48",
    accent: "from-rose-500 to-orange-400",
    icon: "book-open",
    lessonCount: 38,
    examCount: 10,
    aliases: ["Ngữ Văn"],
    units: [
      { title: "Đọc hiểu văn bản", lessons: ["Phương thức biểu đạt và phong cách ngôn ngữ", "Biện pháp tu từ và hiệu quả nghệ thuật", "Thông điệp và quan điểm tác giả"] },
      { title: "Nghị luận và tác phẩm", lessons: ["Viết đoạn nghị luận xã hội", "Phân tích thơ hiện đại", "Phân tích nhân vật trong văn xuôi"] },
    ],
    sampleQuestion: {
      prompt: "Biện pháp tu từ gọi tên sự vật này bằng tên sự vật khác có nét tương đồng là gì?",
      answers: ["So sánh", "Ẩn dụ", "Hoán dụ", "Điệp ngữ"],
      correctIndex: 1,
      explanation: "Ẩn dụ dựa trên nét tương đồng giữa các sự vật.",
    },
  },
  {
    slug: "tieng-anh",
    name: "Tiếng Anh",
    shortName: "Tiếng Anh",
    description: "Củng cố từ vựng, ngữ pháp, đọc hiểu và chiến thuật làm bài.",
    color: "#7c3aed",
    accent: "from-violet-500 to-indigo-400",
    icon: "languages",
    lessonCount: 40,
    examCount: 15,
    aliases: ["Tiếng Anh"],
    units: [
      { title: "Grammar and Vocabulary", lessons: ["Tenses and time expressions", "Conditional sentences", "Word forms and collocations"] },
      { title: "Reading and Communication", lessons: ["Reading for main ideas", "Inference and reference questions", "Everyday communication"] },
    ],
    sampleQuestion: {
      prompt: "Choose the correct answer: She ___ English for five years.",
      answers: ["learns", "learned", "has learned", "is learning yesterday"],
      correctIndex: 2,
      explanation: "Present perfect is used with 'for five years'.",
    },
  },
  {
    slug: "lich-su",
    name: "Lịch Sử",
    shortName: "Lịch Sử",
    description: "Ghi nhớ sự kiện theo dòng thời gian, nguyên nhân, diễn biến và ý nghĩa.",
    color: "#d97706",
    accent: "from-amber-500 to-yellow-400",
    icon: "landmark",
    lessonCount: 30,
    examCount: 8,
    aliases: ["Lịch Sử", "Lịch sử"],
    units: [
      { title: "Lịch sử Việt Nam hiện đại", lessons: ["Cách mạng tháng Tám năm 1945", "Kháng chiến chống Pháp", "Đất nước từ 1954 đến 1975"] },
      { title: "Lịch sử thế giới", lessons: ["Trật tự thế giới sau năm 1945", "Phong trào giải phóng dân tộc", "Quan hệ quốc tế thời kỳ Chiến tranh lạnh"] },
    ],
    sampleQuestion: {
      prompt: "Nước Việt Nam Dân chủ Cộng hòa được thành lập vào ngày nào?",
      answers: ["19/8/1945", "2/9/1945", "7/5/1954", "30/4/1975"],
      correctIndex: 1,
      explanation: "Ngày 2/9/1945, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập.",
    },
  },
  {
    slug: "dia-ly",
    name: "Địa Lý",
    shortName: "Địa Lý",
    description: "Đọc Atlat, phân tích biểu đồ và vận dụng kiến thức tự nhiên, kinh tế.",
    color: "#059669",
    accent: "from-emerald-500 to-teal-400",
    icon: "earth",
    lessonCount: 32,
    examCount: 9,
    aliases: ["Địa Lý", "Địa lý"],
    units: [
      { title: "Địa lý tự nhiên", lessons: ["Vị trí địa lý và phạm vi lãnh thổ", "Khí hậu nhiệt đới gió mùa", "Đất, sinh vật và thiên tai"] },
      { title: "Địa lý kinh tế", lessons: ["Dân số và lao động", "Các ngành kinh tế trọng điểm", "Vùng kinh tế và phát triển bền vững"] },
    ],
    sampleQuestion: {
      prompt: "Khí hậu Việt Nam mang tính chất chủ yếu nào?",
      answers: ["Ôn đới hải dương", "Nhiệt đới ẩm gió mùa", "Cận cực", "Hoang mạc"],
      correctIndex: 1,
      explanation: "Vị trí nội chí tuyến và hoạt động gió mùa tạo nên tính nhiệt đới ẩm gió mùa.",
    },
  },
  {
    slug: "sinh-hoc",
    name: "Sinh Học",
    shortName: "Sinh Học",
    description: "Học theo sơ đồ cơ chế sống, di truyền, tiến hóa và sinh thái.",
    color: "#16a34a",
    accent: "from-green-500 to-lime-400",
    icon: "dna",
    lessonCount: 36,
    examCount: 11,
    aliases: ["Sinh Học", "Sinh học"],
    units: biologyUnits,
    sampleQuestion: {
      prompt: "Đơn phân cấu tạo nên protein là gì?",
      answers: ["Nucleotide", "Amino acid", "Glucose", "Glycerol"],
      correctIndex: 1,
      explanation: "Protein là polymer được cấu tạo từ các amino acid.",
    },
  },
  {
    slug: "vat-ly",
    name: "Vật Lý",
    shortName: "Vật Lý",
    description: "Nắm hiện tượng, công thức và phương pháp giải bài định lượng.",
    color: "#0284c7",
    accent: "from-sky-500 to-blue-400",
    icon: "atom",
    lessonCount: 39,
    examCount: 12,
    aliases: ["Vật Lý", "Vật lý"],
    units: physicsUnits,
    sampleQuestion: {
      prompt: "Đơn vị SI của lực là gì?",
      answers: ["Joule", "Watt", "Newton", "Pascal"],
      correctIndex: 2,
      explanation: "Lực được đo bằng Newton, ký hiệu N.",
    },
  },
  {
    slug: "hoa-hoc",
    name: "Hóa Học",
    shortName: "Hóa Học",
    description: "Hệ thống phản ứng, bản chất hóa học và kỹ năng tính toán.",
    color: "#c026d3",
    accent: "from-fuchsia-500 to-pink-400",
    icon: "flask",
    lessonCount: 37,
    examCount: 12,
    aliases: ["Hóa Học", "Hóa học"],
    units: chemistryUnits,
    sampleQuestion: {
      prompt: "Dung dịch có pH nhỏ hơn 7 thuộc môi trường nào?",
      answers: ["Acid", "Base", "Trung tính", "Không xác định"],
      correctIndex: 0,
      explanation: "Dung dịch acid có pH nhỏ hơn 7.",
    },
  },
  {
    slug: "khtn-sinh-hoc",
    name: "KHTN (Sinh Học)",
    shortName: "KHTN Sinh",
    description: "Phần khoa học sự sống dành cho chương trình THCS.",
    color: "#22c55e",
    accent: "from-green-500 to-emerald-400",
    icon: "dna",
    lessonCount: 28,
    examCount: 8,
    aliases: ["KHTN (Sinh Học)"],
    units: biologyUnits,
    sampleQuestion: {
      prompt: "Cơ quan nào thực hiện quang hợp chủ yếu ở thực vật?",
      answers: ["Rễ", "Thân", "Lá", "Hoa"],
      correctIndex: 2,
      explanation: "Lá chứa nhiều lục lạp và là cơ quan quang hợp chủ yếu.",
    },
  },
  {
    slug: "khtn-vat-ly",
    name: "KHTN (Vật Lý)",
    shortName: "KHTN Lý",
    description: "Phần năng lượng, lực, điện và hiện tượng vật lý dành cho THCS.",
    color: "#0ea5e9",
    accent: "from-cyan-500 to-blue-400",
    icon: "atom",
    lessonCount: 27,
    examCount: 8,
    aliases: ["KHTN (Vật Lý)"],
    units: physicsUnits,
    sampleQuestion: {
      prompt: "Dụng cụ dùng để đo cường độ dòng điện là gì?",
      answers: ["Vôn kế", "Ampe kế", "Nhiệt kế", "Lực kế"],
      correctIndex: 1,
      explanation: "Ampe kế được mắc nối tiếp để đo cường độ dòng điện.",
    },
  },
  {
    slug: "khtn-hoa-hoc",
    name: "KHTN (Hóa Học)",
    shortName: "KHTN Hóa",
    description: "Phần chất, nguyên tử và biến đổi hóa học dành cho THCS.",
    color: "#db2777",
    accent: "from-pink-500 to-fuchsia-400",
    icon: "flask",
    lessonCount: 27,
    examCount: 8,
    aliases: ["KHTN (Hóa Học)"],
    units: chemistryUnits,
    sampleQuestion: {
      prompt: "Hạt mang điện tích âm trong nguyên tử là gì?",
      answers: ["Proton", "Neutron", "Electron", "Hạt nhân"],
      correctIndex: 2,
      explanation: "Electron mang điện tích âm và chuyển động quanh hạt nhân.",
    },
  },
  {
    slug: "kt-va-phap-luat",
    name: "KT&PL",
    shortName: "KT&PL",
    description: "Vận dụng kiến thức kinh tế, pháp luật và trách nhiệm công dân.",
    color: "#475569",
    accent: "from-slate-600 to-slate-400",
    icon: "scale",
    lessonCount: 26,
    examCount: 7,
    aliases: ["KT&PL"],
    units: [
      { title: "Kinh tế và thị trường", lessons: ["Cung, cầu và giá cả", "Sản xuất kinh doanh", "Ngân sách và tiêu dùng thông minh"] },
      { title: "Pháp luật và công dân", lessons: ["Quyền và nghĩa vụ cơ bản", "Bình đẳng trước pháp luật", "Trách nhiệm pháp lý"] },
    ],
    sampleQuestion: {
      prompt: "Mọi công dân đều bình đẳng trước yếu tố nào?",
      answers: ["Tài sản", "Pháp luật", "Nghề nghiệp", "Địa vị xã hội"],
      correctIndex: 1,
      explanation: "Hiến pháp quy định mọi công dân đều bình đẳng trước pháp luật.",
    },
  },
  {
    slug: "cong-nghe",
    name: "Công Nghệ",
    shortName: "Công Nghệ",
    description: "Khám phá thiết kế kỹ thuật, sản xuất và ứng dụng công nghệ.",
    color: "#ea580c",
    accent: "from-orange-500 to-amber-400",
    icon: "cog",
    lessonCount: 25,
    examCount: 7,
    aliases: ["Công Nghệ", "Công nghệ"],
    units: [
      { title: "Thiết kế và kỹ thuật", lessons: ["Quy trình thiết kế kỹ thuật", "Bản vẽ và mô hình", "An toàn trong lao động"] },
      { title: "Công nghệ trong đời sống", lessons: ["Mạng điện trong nhà", "Thiết bị gia dụng", "Sử dụng năng lượng hiệu quả"] },
    ],
    sampleQuestion: {
      prompt: "Bước đầu tiên của quy trình thiết kế kỹ thuật thường là gì?",
      answers: ["Chế tạo", "Xác định vấn đề", "Đánh giá sản phẩm", "Thử nghiệm"],
      correctIndex: 1,
      explanation: "Cần xác định đúng vấn đề và yêu cầu trước khi đề xuất giải pháp.",
    },
  },
  {
    slug: "cong-nghe-nong-nghiep",
    name: "Công nghệ Nông nghiệp",
    shortName: "CN Nông nghiệp",
    description: "Ứng dụng khoa học vào trồng trọt, chăn nuôi và nông nghiệp bền vững.",
    color: "#65a30d",
    accent: "from-lime-600 to-green-400",
    icon: "leaf",
    lessonCount: 24,
    examCount: 6,
    aliases: ["Công nghệ Nông nghiệp"],
    units: [
      { title: "Trồng trọt hiện đại", lessons: ["Đất trồng và dinh dưỡng cây", "Giống và nhân giống cây trồng", "Phòng trừ sâu bệnh an toàn"] },
      { title: "Nông nghiệp bền vững", lessons: ["Nông nghiệp công nghệ cao", "Tưới tiêu tiết kiệm", "Bảo quản và chế biến nông sản"] },
    ],
    sampleQuestion: {
      prompt: "Mục tiêu chính của tưới nhỏ giọt là gì?",
      answers: ["Tăng xói mòn", "Tiết kiệm nước", "Làm đất chua", "Giảm dinh dưỡng"],
      correctIndex: 1,
      explanation: "Tưới nhỏ giọt đưa nước trực tiếp đến vùng rễ và giảm thất thoát.",
    },
  },
  {
    slug: "cong-nghe-cong-nghiep",
    name: "Công nghệ Công nghiệp",
    shortName: "CN Công nghiệp",
    description: "Tìm hiểu cơ khí, điện, tự động hóa và quy trình sản xuất hiện đại.",
    color: "#9333ea",
    accent: "from-purple-600 to-violet-400",
    icon: "factory",
    lessonCount: 25,
    examCount: 6,
    aliases: ["Công nghệ Công nghiệp"],
    units: [
      { title: "Cơ khí và chế tạo", lessons: ["Vật liệu cơ khí", "Gia công và chế tạo", "Đọc bản vẽ kỹ thuật"] },
      { title: "Điện và tự động hóa", lessons: ["Mạch điện điều khiển", "Cảm biến và cơ cấu chấp hành", "Hệ thống sản xuất tự động"] },
    ],
    sampleQuestion: {
      prompt: "Thiết bị nào dùng để phát hiện sự thay đổi của môi trường?",
      answers: ["Cảm biến", "Máy biến áp", "Cầu chì", "Ổ cắm"],
      correctIndex: 0,
      explanation: "Cảm biến thu nhận các đại lượng vật lý và chuyển thành tín hiệu.",
    },
  },
];

export function getSubjectLearningItem(slug: string) {
  return subjectLearningCatalog.find((subject) => subject.slug === slug);
}

export function getSubjectSlug(name: string) {
  const normalized = name.trim().toLocaleLowerCase("vi");
  return subjectLearningCatalog.find((subject) =>
    subject.aliases.some((alias) => alias.toLocaleLowerCase("vi") === normalized),
  )?.slug;
}

export const subjectSlugsByLearningLevel = {
  secondary: [
    "toan",
    "ngu-van",
    "tieng-anh",
    "lich-su",
    "dia-ly",
    "khtn-sinh-hoc",
    "khtn-vat-ly",
    "khtn-hoa-hoc",
    "cong-nghe",
  ],
  "high-school": [
    "toan",
    "ngu-van",
    "tieng-anh",
    "lich-su",
    "dia-ly",
    "sinh-hoc",
    "vat-ly",
    "hoa-hoc",
    "kt-va-phap-luat",
    "cong-nghe-nong-nghiep",
    "cong-nghe-cong-nghiep",
  ],
  "grade-10": [
    "toan",
    "ngu-van",
    "tieng-anh",
  ],
  "national-exam": [
    "toan",
    "ngu-van",
    "tieng-anh",
    "lich-su",
    "dia-ly",
    "sinh-hoc",
    "vat-ly",
    "hoa-hoc",
    "kt-va-phap-luat",
    "cong-nghe-nong-nghiep",
    "cong-nghe-cong-nghiep",
  ],
} as const;

export type LearningLevel = keyof typeof subjectSlugsByLearningLevel;

export function isLearningLevel(value: string | undefined): value is LearningLevel {
  return Boolean(value && value in subjectSlugsByLearningLevel);
}

export function getSubjectsForLearningLevel(level: string | undefined) {
  if (!isLearningLevel(level)) return subjectLearningCatalog;
  const allowedSlugs = new Set<string>(subjectSlugsByLearningLevel[level]);
  return subjectLearningCatalog.filter((subject) => allowedSlugs.has(subject.slug));
}
