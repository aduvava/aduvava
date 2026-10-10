import { prisma } from "@/lib/db";

export const fallbackSubjects = [
  { id: "fallback-history", slug: "lich-su", name: "Lịch sử", family: "THPTQG", description: "Luyện đề theo chuyên đề, mốc thời gian và dạng câu hỏi mới.", color: "#f06d3a", _count: { exams: 12 } },
  { id: "fallback-math", slug: "toan", name: "Toán", family: "THPTQG", description: "Ngân hàng câu hỏi theo mức nhận biết, thông hiểu, vận dụng.", color: "#1f6f5b", _count: { exams: 18 } },
  { id: "fallback-dgnl", slug: "dgnl-hcm", name: "ĐGNL HCM", family: "DGNL", description: "Bài thi mô phỏng năng lực ngôn ngữ, toán học và tư duy khoa học.", color: "#10212b", _count: { exams: 8 } }
];

export const fallbackBlogs = [
  { id: "blog-1", slug: "chien-luoc-on-thi-30-ngay", title: "Chiến lược ôn thi 30 ngày", excerpt: "Cách chia thời gian luyện đề, chữa lỗi và tăng điểm theo từng tuần.", publishedAt: new Date() },
  { id: "blog-2", slug: "doc-bao-cao-ket-qua", title: "Cách đọc báo cáo kết quả", excerpt: "Biến điểm số thành kế hoạch học tập cụ thể thay vì chỉ xem đúng sai.", publishedAt: new Date() }
];

export async function getPublicSubjects(family?: "THPTQG" | "DGNL") {
  try {
    return await prisma.subject.findMany({
      where: family ? { family } : undefined,
      include: { _count: { select: { exams: true } } },
      orderBy: { name: "asc" }
    });
  } catch {
    return fallbackSubjects.filter((subject) => !family || subject.family === family);
  }
}

export async function getPublishedBlogs(take = 6) {
  try {
    return await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take
    });
  } catch {
    return fallbackBlogs.slice(0, take);
  }
}

export async function getPublicPlans() {
  try {
    return await prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } });
  } catch {
    return [
      { id: "starter", slug: "starter", name: "Starter", description: "Dành cho học sinh mới bắt đầu", price: 0, interval: "MONTH", features: ["Đề miễn phí", "Dashboard cơ bản"] },
      { id: "pro", slug: "pro", name: "Pro", description: "Mở khóa kho đề và lý thuyết", price: 99000, interval: "MONTH", features: ["Đề PRO", "Lý thuyết", "Phân tích điểm yếu"] }
    ];
  }
}
