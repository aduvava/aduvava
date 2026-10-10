export type Classroom = {
  id: string;
  name: string;
  teacher: string;
  subject: string;
  description: string;
  schedule: string;
  students: number;
  assignments: number;
  newAssignments: number;
  progress: number;
  accent: string;
  cover: string;
  code: string;
};

export const defaultClassrooms: Classroom[] = [
  {
    id: "toan-thay-hung-k26",
    name: "Toán Thầy Hùng - K26",
    teacher: "Thầy Nguyễn Mạnh Hùng",
    subject: "Toán học",
    description: "Luyện đề, chữa bài và củng cố kiến thức Toán lớp 12 theo từng chuyên đề.",
    schedule: "Thứ 3, 5 - 19:30",
    students: 45,
    assignments: 12,
    newAssignments: 3,
    progress: 72,
    accent: "from-orange-500 to-amber-400",
    cover: "from-slate-800 via-orange-700 to-amber-300",
    code: "TOAN26",
  },
  {
    id: "luyen-de-anh-van-12",
    name: "Luyện đề Anh Văn 12",
    teacher: "Cô Phan Thị Tuyết Mai",
    subject: "Tiếng Anh",
    description: "Ôn từ vựng, ngữ pháp và chiến thuật làm bài thi tốt nghiệp THPT.",
    schedule: "Thứ 2, 6 - 20:00",
    students: 45,
    assignments: 9,
    newAssignments: 1,
    progress: 58,
    accent: "from-blue-500 to-cyan-400",
    cover: "from-sky-900 via-cyan-600 to-amber-100",
    code: "ANH12",
  },
  {
    id: "van-hoc-va-cuoc-song",
    name: "Văn học và Cuộc sống",
    teacher: "Cô Trần Thu Hà",
    subject: "Ngữ Văn",
    description: "Phát triển tư duy đọc hiểu, lập luận và kỹ năng viết bài nghị luận.",
    schedule: "Thứ 4 - 19:00",
    students: 32,
    assignments: 7,
    newAssignments: 2,
    progress: 64,
    accent: "from-rose-500 to-orange-400",
    cover: "from-rose-900 via-pink-600 to-orange-200",
    code: "VAN26",
  },
  {
    id: "vat-ly-thay-minh",
    name: "Vật Lý cùng Thầy Minh",
    teacher: "Thầy Lê Quang Minh",
    subject: "Vật Lý",
    description: "Hệ thống công thức và luyện bài tập Vật Lý từ cơ bản đến vận dụng cao.",
    schedule: "Chủ nhật - 08:30",
    students: 38,
    assignments: 10,
    newAssignments: 0,
    progress: 81,
    accent: "from-violet-500 to-indigo-500",
    cover: "from-indigo-950 via-violet-700 to-fuchsia-300",
    code: "LY12",
  },
];
