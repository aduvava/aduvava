const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const plans = [
  {
    slug: "ava-basic",
    name: "Gói 39k",
    description: "Gói cơ bản để mở khóa kho đề và AI Ava chấm văn ở mức vừa đủ.",
    price: 39000,
    interval: "MONTH",
    features: [
      "Mở khóa trọn bộ đề thi tất cả các môn từ lớp 6 - 12, các kì thi quan trọng như Ôn thi vào 10, ôn thi THPTQG",
      "Hệ thống đáp án và cơ sở lý thuyết bám sát sách giáo khoa",
      "Tự tạo đề thi nhanh không giới hạn",
      "AI Ava chấm bài thi môn Ngữ văn (Tối đa 2 bài)",
    ],
  },
  {
    slug: "ava-monthly",
    name: "Gói 99k",
    description: "Gói toàn diện cho học sinh luyện đều mỗi tháng.",
    price: 99000,
    interval: "MONTH",
    features: [
      "Mở khóa trọn bộ đề thi tất cả các môn từ lớp 6 - 12, các kì thi quan trọng như Ôn thi vào 10, ôn thi THPTQG",
      "Hệ thống đáp án và cơ sở lý thuyết bám sát sách giáo khoa",
      "Tự tạo đề thi nhanh KHÔNG GIỚI HẠN",
      "AI Ava chấm bài thi môn Ngữ văn (Tối đa 6 bài)",
      "Phân tích biểu đồ năng lực chi tiết",
      "Bảng xếp hạng thi đua",
      "Tiết kiệm 45% so với gói mua lẻ theo tuần",
    ],
  },
  {
    slug: "ava-quarter",
    name: "Gói 299k",
    description: "Gói dài hạn cho học sinh ôn luyện nghiêm túc.",
    price: 299000,
    interval: "QUARTER",
    features: [
      "Mở khóa trọn bộ đề thi tất cả các môn từ lớp 6 - 12, các kì thi quan trọng như Ôn thi vào 10, ôn thi THPTQG",
      "Hệ thống đáp án và cơ sở lý thuyết bám sát sách giáo khoa",
      "Tự tạo đề thi nhanh KHÔNG GIỚI HẠN",
      "AI Ava chấm bài thi môn Ngữ văn KHÔNG GIỚI HẠN",
      "Phân tích biểu đồ năng lực chi tiết",
      "Bảng xếp hạng thi đua",
      "Tiết kiệm 50% so với gói mua lẻ theo tuần",
    ],
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        interval: plan.interval,
        features: plan.features,
        isActive: true,
      },
      create: {
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        interval: plan.interval,
        features: plan.features,
        isActive: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
