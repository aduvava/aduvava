const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Run only after the HALF_YEAR migration. Keep legacy plan IDs to preserve
// every existing payment, subscription, and outstanding bank transfer.
const features = [
  "Mở khóa đề thi VIP đã xuất bản",
  "Truy cập lý thuyết và học liệu VIP nâng cao",
  "Thanh toán một lần, không tự động gia hạn",
];

const plans = [
  { slug: "educhi-vip-1m", name: "Gói 1 tháng", description: "39.000đ/tháng", price: 39000, interval: "MONTH" },
  { slug: "educhi-vip-3m", name: "Gói 3 tháng", description: "33.000đ/tháng, tiết kiệm 18.000đ so với mua lẻ", price: 99000, interval: "QUARTER" },
  { slug: "educhi-vip-6m", name: "Gói 6 tháng", description: "31.500đ/tháng, tiết kiệm 45.000đ so với mua lẻ", price: 189000, interval: "HALF_YEAR" },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.plan.updateMany({ where: { isActive: true }, data: { isActive: false } });
    for (const plan of plans) {
      await tx.plan.upsert({
        where: { slug: plan.slug },
        update: { ...plan, features, isActive: true },
        create: { ...plan, features, isActive: true },
      });
    }
  });
  console.log("Educhi VIP: 39k/1 month, 99k/3 months, 189k/6 months. Legacy history preserved.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
