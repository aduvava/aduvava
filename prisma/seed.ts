import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { subjectLearningCatalog } from "../src/data/subject-learning-catalog";
import { getNationalQuestionCount, nationalExamRules } from "../src/lib/national-exam-rules";

const prisma = new PrismaClient();

function createSamplePdf(filePath: string, title: string, lines: string[]) {
  const escapePdf = (value: string) => value.replace(/([\\()])/g, "\\$1").replace(/[^\x20-\x7E]/g, "");
  const commands = [
    "BT",
    "/F1 20 Tf",
    "72 760 Td",
    `(${escapePdf(title)}) Tj`,
    "/F1 12 Tf",
    ...lines.flatMap((line) => ["0 -32 Td", `(${escapePdf(line)}) Tj`]),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(commands, "ascii")} >>\nstream\n${commands}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  fs.writeFileSync(filePath, pdf, "ascii");
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error("Set SEED_ADMIN_EMAIL to a valid email address before seeding.");
  }
  if (!adminPassword || adminPassword.length < 16) {
    throw new Error("Set SEED_ADMIN_PASSWORD to a unique password of at least 16 characters before seeding.");
  }

  const demoEmail = process.env.SEED_DEMO_EMAIL?.trim() || "student-demo@example.invalid";
  const teacherEmail = process.env.SEED_TEACHER_EMAIL?.trim() || "teacher-demo@example.invalid";
  const demoPassword = process.env.SEED_DEMO_PASSWORD || crypto.randomBytes(32).toString("base64url");
  const teacherPassword = process.env.SEED_TEACHER_PASSWORD || crypto.randomBytes(32).toString("base64url");
  const passwordAdmin = await bcrypt.hash(adminPassword, 12);
  const passwordDemo = await bcrypt.hash(demoPassword, 12);
  const passwordTeacher = await bcrypt.hash(teacherPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", passwordHash: passwordAdmin },
    create: { email: adminEmail, name: "Admin", role: "ADMIN", passwordHash: passwordAdmin }
  });

  if (process.env.EDUVA_SEED_DEMO_DATA !== "true") {
    console.log(`Admin account ready: ${admin.email}. Demo users and sample content were skipped.`);
    return;
  }

  const demo = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { passwordHash: passwordDemo },
    create: { email: demoEmail, name: "Há»c sinh Demo", role: "STUDENT", passwordHash: passwordDemo }
  });

  const teacher = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: { role: "TEACHER", passwordHash: passwordTeacher },
    create: {
      email: teacherEmail,
      name: "Nguyá»…n Máº¡nh HĂ¹ng",
      role: "TEACHER",
      passwordHash: passwordTeacher,
    },
  });

  await prisma.user.updateMany({
    where: { id: demo.id, exp: 0 },
    data: { exp: 120 },
  });

  const storeItems = [
    {
      slug: "khung-avatar-mua-thi",
      name: "áº¢nh bĂ¬a GĂ³c há»c táº­p cam",
      description: "KhĂ´ng gian há»c táº­p tĂ´ng cam dĂ nh cho trang chá»§.",
      category: "AVATAR" as const,
      price: 750,
      currency: "EXP" as const,
      imageKey: "orange",
      badge: "Sá»° KIá»†N",
      isFeatured: true,
      isConsumable: false,
      sortOrder: 1,
    },
    {
      slug: "the-50-50",
      name: "Tháº» 50/50",
      description: "Loáº¡i bá» 2 Ä‘Ă¡p Ă¡n sai trong cĂ¢u há»i khĂ³.",
      category: "HELP" as const,
      price: 200,
      currency: "EXP" as const,
      imageKey: "temple",
      badge: "BĂN CHáº Y",
      isFeatured: false,
      isConsumable: true,
      sortOrder: 2,
    },
    {
      slug: "ngung-dong-thoi-gian",
      name: "NgÆ°ng dĂ²ng thá»i gian",
      description: "Táº¡m dá»«ng Ä‘á»“ng há»“ lĂ m bĂ i trong 30 giĂ¢y.",
      category: "HELP" as const,
      price: 500,
      currency: "EXP" as const,
      imageKey: "freeze",
      badge: null,
      isFeatured: false,
      isConsumable: true,
      sortOrder: 3,
    },
    {
      slug: "the-x2-exp",
      name: "Tháº» x2 EXP",
      description: "NhĂ¢n Ä‘Ă´i EXP nháº­n Ä‘Æ°á»£c trong bĂ i thi tiáº¿p theo.",
      category: "STUDY_PACK" as const,
      price: 80,
      currency: "EXP" as const,
      imageKey: "beach",
      badge: "VIP",
      isFeatured: false,
      isConsumable: true,
      sortOrder: 4,
    },
    {
      slug: "khung-avatar-neon",
      name: "áº¢nh bĂ¬a ThĂ nh phá»‘ Neon",
      description: "Äá»•i áº£nh trang chá»§ sang khung cáº£nh neon vá» Ä‘Ăªm.",
      category: "AVATAR" as const,
      price: 1500,
      currency: "EXP" as const,
      imageKey: "neon",
      badge: null,
      isFeatured: false,
      isConsumable: false,
      sortOrder: 5,
    },
    {
      slug: "anh-bia-bai-bien",
      name: "áº¢nh bĂ¬a BĂ£i biá»ƒn yĂªn tÄ©nh",
      description: "Khung cáº£nh biá»ƒn nháº¹ nhĂ ng cho gĂ³c há»c táº­p.",
      category: "AVATAR" as const,
      price: 900,
      currency: "EXP" as const,
      imageKey: "beach",
      badge: "Má»I",
      isFeatured: false,
      isConsumable: false,
      sortOrder: 6,
    },
    {
      slug: "anh-bia-phong-doc",
      name: "áº¢nh bĂ¬a PhĂ²ng Ä‘á»c sĂ¡ch",
      description: "Má»™t phĂ²ng Ä‘á»c áº¥m Ă¡p dĂ nh cho ngÆ°á»i mĂª sĂ¡ch.",
      category: "AVATAR" as const,
      price: 120,
      currency: "EXP" as const,
      imageKey: "book",
      badge: null,
      isFeatured: false,
      isConsumable: false,
      sortOrder: 7,
    },
    {
      slug: "goi-on-thi-tap-trung",
      name: "GĂ³i Ă´n thi táº­p trung",
      description: "Bá»™ checklist vĂ  lá»™ trĂ¬nh Ă´n táº­p 14 ngĂ y.",
      category: "STUDY_PACK" as const,
      price: 700,
      currency: "EXP" as const,
      imageKey: "book",
      badge: "Má»I",
      isFeatured: false,
      isConsumable: false,
      sortOrder: 8,
    },
    {
      slug: "hop-qua-bi-mat",
      name: "Há»™p quĂ  bĂ­ máº­t",
      description: "Äá»•i EXP láº¥y má»™t pháº§n quĂ  ngáº«u nhiĂªn.",
      category: "GIFT" as const,
      price: 100,
      currency: "EXP" as const,
      imageKey: "gift",
      badge: "GIá»I Háº N",
      isFeatured: false,
      isConsumable: true,
      stock: 100,
      sortOrder: 9,
    },
    {
      slug: "trang-bi-focus",
      name: "Trang bá»‹ Focus",
      description: "Huy hiá»‡u táº­p trung hiá»ƒn thá»‹ trĂªn há»“ sÆ¡.",
      category: "EQUIPMENT" as const,
      price: 350,
      currency: "EXP" as const,
      imageKey: "beach",
      badge: null,
      isFeatured: false,
      isConsumable: false,
      sortOrder: 10,
    },
  ];

  for (const item of storeItems) {
    await prisma.storeItem.upsert({
      where: { slug: item.slug },
      update: item,
      create: item,
    });
  }

  await prisma.studentProfile.upsert({
    where: { userId: demo.id },
    update: { grade: "12", province: "TP. Há»“ ChĂ­ Minh", aspiration: "Đại học Bách khoa Hà Nội", targetScore: "27+ điểm" },
    create: { userId: demo.id, grade: "12", province: "TP. Há»“ ChĂ­ Minh", aspiration: "Đại học Bách khoa Hà Nội", targetScore: "27+ điểm", source: "seed" }
  });

  await prisma.plan.upsert({
    where: { slug: "ava-basic" },
    update: {
      name: "Gói 39k",
      description: "Gói VIP cơ bản để mở khóa đề thi và tự tạo đề nhanh.",
      price: 39000,
      interval: "MONTH",
      features: [
        "Mở khóa trọn bộ đề thi tất cả các môn từ lớp 6 - 12, các kì thi quan trọng như Ôn thi vào 10, ôn thi THPTQG",
        "Hệ thống đáp án và cơ sở lý thuyết bám sát sách giáo khoa",
        "Tự tạo đề thi nhanh không giới hạn",
        "AI Ava chấm bài thi môn Ngữ văn (Tối đa 2 bài)",
      ],
      isActive: true,
    },
    create: {
      slug: "ava-basic",
      name: "Gói 39k",
      description: "Gói VIP cơ bản để mở khóa đề thi và tự tạo đề nhanh.",
      price: 39000,
      interval: "MONTH",
      features: [
        "Mở khóa trọn bộ đề thi tất cả các môn từ lớp 6 - 12, các kì thi quan trọng như Ôn thi vào 10, ôn thi THPTQG",
        "Hệ thống đáp án và cơ sở lý thuyết bám sát sách giáo khoa",
        "Tự tạo đề thi nhanh không giới hạn",
        "AI Ava chấm bài thi môn Ngữ văn (Tối đa 2 bài)",
      ],
    }
  });

  const monthly = await prisma.plan.upsert({
    where: { slug: "ava-monthly" },
    update: {
      name: "Toàn Diện",
      description: "Gói VIP toàn diện cho học sinh ôn luyện hằng tháng.",
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
      isActive: true,
    },
    create: {
      slug: "ava-monthly",
      name: "Toàn Diện",
      description: "Gói VIP toàn diện cho học sinh ôn luyện hằng tháng.",
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
    }
  });

  await prisma.plan.upsert({
    where: { slug: "ava-quarter" },
    update: {
      name: "Đột Phá",
      description: "Gói VIP 3 tháng cho giai đoạn tăng tốc và nước rút.",
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
      isActive: true,
    },
    create: {
      slug: "ava-quarter",
      name: "Đột Phá",
      description: "Gói VIP 3 tháng cho giai đoạn tăng tốc và nước rút.",
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
    }
  });

  await prisma.plan.updateMany({
    where: { slug: { in: ["ava-trial", "pro-monthly", "pro-quarter"] } },
    data: { isActive: false },
  });

  const history = await prisma.subject.upsert({
    where: { slug: "lich-su" },
    update: {},
    create: {
      slug: "lich-su",
      name: "Lá»‹ch sá»­",
      family: "THPTQG",
      description: "Luyá»‡n Ä‘á» Lá»‹ch sá»­ theo má»‘c thá»i gian, giai Ä‘oáº¡n vĂ  dáº¡ng cĂ¢u há»i tráº¯c nghiá»‡m.",
      color: "#f06d3a",
      icon: "landmark"
    }
  });

  const math = await prisma.subject.upsert({
    where: { slug: "toan" },
    update: {},
    create: {
      slug: "toan",
      name: "ToĂ¡n",
      family: "THPTQG",
      description: "BĂ i thi ToĂ¡n mĂ´ phá»ng cáº¥u trĂºc má»›i, cĂ³ phĂ¢n táº§ng Ä‘á»™ khĂ³.",
      color: "#1f6f5b",
      icon: "sigma"
    }
  });

  const dgnl = await prisma.subject.upsert({
    where: { slug: "dgnl-hcm" },
    update: {},
    create: {
      slug: "dgnl-hcm",
      name: "ÄGNL HCM",
      family: "DGNL",
      description: "Bá»™ Ä‘á» Ä‘Ă¡nh giĂ¡ nÄƒng lá»±c gá»“m ngĂ´n ngá»¯, toĂ¡n há»c vĂ  tÆ° duy khoa há»c.",
      color: "#10212b",
      icon: "brain"
    }
  });

  const vietnam1945 = await prisma.topic.upsert({
    where: { subjectId_slug: { subjectId: history.id, slug: "viet-nam-1945-1975" } },
    update: {},
    create: { subjectId: history.id, slug: "viet-nam-1945-1975", name: "Viá»‡t Nam 1945-1975" }
  });

  const worldHistory = await prisma.topic.upsert({
    where: { subjectId_slug: { subjectId: history.id, slug: "the-gioi-sau-1945" } },
    update: {},
    create: { subjectId: history.id, slug: "the-gioi-sau-1945", name: "Tháº¿ giá»›i sau 1945" }
  });

  const algebra = await prisma.topic.upsert({
    where: { subjectId_slug: { subjectId: math.id, slug: "ham-so" } },
    update: {},
    create: { subjectId: math.id, slug: "ham-so", name: "HĂ m sá»‘" }
  });

  await prisma.exam.upsert({
    where: { code: "HIS-2026-FREE-01" },
    update: {},
    create: {
      code: "HIS-2026-FREE-01",
      slug: "lich-su-de-minh-hoa-2026-free",
      title: "Äá» minh há»a Lá»‹ch sá»­ 2026 - Free",
      description: "Äá» ngáº¯n Ä‘á»ƒ kiá»ƒm thá»­ luá»“ng lĂ m bĂ i, cháº¥m Ä‘iá»ƒm vĂ  bĂ¡o cĂ¡o.",
      family: "THPTQG",
      type: "MOCK",
      accessLevel: "FREE",
      year: 2026,
      durationMinutes: 30,
      targetScore: 8,
      subjectId: history.id,
      questions: {
        create: [
          {
            position: 1,
            type: "SINGLE_CHOICE",
            topicId: vietnam1945.id,
            prompt: "Sá»± kiá»‡n nĂ o Ä‘Ă¡nh dáº¥u tháº¯ng lá»£i cá»§a CĂ¡ch máº¡ng thĂ¡ng TĂ¡m nÄƒm 1945 á»Ÿ HĂ  Ná»™i?",
            points: 1,
            explanation: "NgĂ y 19/8/1945, khá»Ÿi nghÄ©a giĂ nh chĂ­nh quyá»n tháº¯ng lá»£i á»Ÿ HĂ  Ná»™i.",
            answerOptions: {
              create: [
                { label: "A", content: "NgĂ y 19/8/1945", isCorrect: true },
                { label: "B", content: "NgĂ y 2/9/1945", isCorrect: false },
                { label: "C", content: "NgĂ y 23/9/1945", isCorrect: false },
                { label: "D", content: "NgĂ y 6/1/1946", isCorrect: false }
              ]
            }
          },
          {
            position: 2,
            type: "TRUE_FALSE_SET",
            topicId: worldHistory.id,
            prompt: "XĂ¡c Ä‘á»‹nh Ä‘Ăºng/sai vá» tráº­t tá»± tháº¿ giá»›i sau Chiáº¿n tranh tháº¿ giá»›i thá»© hai.",
            points: 2,
            explanation: "Tráº­t tá»± hai cá»±c Ianta chi phá»‘i quan há»‡ quá»‘c táº¿ nhiá»u tháº­p ká»· sau 1945.",
            answerOptions: {
              create: [
                { label: "a", content: "HĂ¬nh thĂ nh tráº­t tá»± hai cá»±c Ianta.", isCorrect: true },
                { label: "b", content: "LiĂªn há»£p quá»‘c Ä‘Æ°á»£c thĂ nh láº­p sau chiáº¿n tranh.", isCorrect: true },
                { label: "c", content: "Chiáº¿n tranh láº¡nh káº¿t thĂºc ngay nÄƒm 1945.", isCorrect: false },
                { label: "d", content: "Má»¹ vĂ  LiĂªn XĂ´ trá»Ÿ thĂ nh hai cá»±c Ä‘á»‘i Ä‘áº§u chĂ­nh.", isCorrect: true }
              ]
            }
          },
          {
            position: 3,
            type: "SHORT_ANSWER",
            topicId: vietnam1945.id,
            prompt: "Äiá»n tĂªn chiáº¿n dá»‹ch káº¿t thĂºc tháº¯ng lá»£i cuá»™c khĂ¡ng chiáº¿n chá»‘ng PhĂ¡p nÄƒm 1954.",
            points: 1,
            correctText: "Äiá»‡n BiĂªn Phá»§",
            explanation: "Chiáº¿n dá»‹ch Äiá»‡n BiĂªn Phá»§ tháº¯ng lá»£i ngĂ y 7/5/1954."
          },
          {
            position: 4,
            type: "ESSAY",
            topicId: vietnam1945.id,
            prompt: "TrĂ¬nh bĂ y ngáº¯n gá»n Ă½ nghÄ©a lá»‹ch sá»­ cá»§a tháº¯ng lá»£i Äiá»‡n BiĂªn Phá»§.",
            points: 2,
            explanation: "CĂ¢u tá»± luáº­n dĂ¹ng mock AI feedback á»Ÿ v1."
          }
        ]
      }
    }
  });

  await prisma.exam.upsert({
    where: { code: "MATH-2026-PRO-01" },
    update: {},
    create: {
      code: "MATH-2026-PRO-01",
      slug: "toan-de-du-doan-2026-pro",
      title: "Äá» dá»± Ä‘oĂ¡n ToĂ¡n 2026 - Pro",
      description: "Äá» PRO cĂ³ gating báº±ng subscription.",
      family: "THPTQG",
      type: "PREDICTION",
      accessLevel: "PRO",
      year: 2026,
      durationMinutes: 90,
      targetScore: 8.5,
      subjectId: math.id,
      questions: {
        create: [
          {
            position: 1,
            type: "SINGLE_CHOICE",
            topicId: algebra.id,
            prompt: "HĂ m sá»‘ y = x^2 Ä‘á»“ng biáº¿n trĂªn khoáº£ng nĂ o?",
            points: 1,
            correctText: null,
            explanation: "HĂ m y=x^2 Ä‘á»“ng biáº¿n trĂªn (0; +âˆ).",
            answerOptions: {
              create: [
                { label: "A", content: "(-âˆ; 0)", isCorrect: false },
                { label: "B", content: "(0; +âˆ)", isCorrect: true },
                { label: "C", content: "R", isCorrect: false },
                { label: "D", content: "KhĂ´ng cĂ³ khoáº£ng nĂ o", isCorrect: false }
              ]
            }
          }
        ]
      }
    }
  });

  await prisma.exam.upsert({
    where: { code: "DGNL-2026-FREE-01" },
    update: {},
    create: {
      code: "DGNL-2026-FREE-01",
      slug: "dgnl-hcm-mini-test-2026",
      title: "ÄGNL HCM Mini Test 2026",
      description: "BĂ i test ngáº¯n mĂ´ phá»ng pháº§n tÆ° duy Ä‘á»‹nh lÆ°á»£ng.",
      family: "DGNL",
      type: "PRACTICE",
      accessLevel: "FREE",
      year: 2026,
      durationMinutes: 25,
      targetScore: 750,
      subjectId: dgnl.id,
      questions: {
        create: [
          {
            position: 1,
            type: "SINGLE_CHOICE",
            prompt: "Náº¿u 3x + 2 = 11 thĂ¬ x báº±ng bao nhiĂªu?",
            points: 1,
            explanation: "3x = 9 nĂªn x = 3.",
            answerOptions: {
              create: [
                { label: "A", content: "2", isCorrect: false },
                { label: "B", content: "3", isCorrect: true },
                { label: "C", content: "4", isCorrect: false },
                { label: "D", content: "5", isCorrect: false }
              ]
            }
          }
        ]
      }
    }
  });

  const practiceVariants = [
    { suffix: "QUICK", title: "Luyá»‡n nhanh", durationMinutes: 20, type: "PRACTICE" as const },
    { suffix: "MOCK", title: "Äá» thi thá»­", durationMinutes: 45, type: "MOCK" as const },
    { suffix: "REVIEW", title: "Ă”n táº­p trá»ng tĂ¢m", durationMinutes: 30, type: "PRACTICE" as const },
  ];

  for (const catalogSubject of subjectLearningCatalog) {
    const subject = await prisma.subject.upsert({
      where: { slug: catalogSubject.slug },
      update: {
        name: catalogSubject.name,
        description: catalogSubject.description,
        color: catalogSubject.color,
        icon: catalogSubject.icon,
      },
      create: {
        slug: catalogSubject.slug,
        name: catalogSubject.name,
        family: "THPTQG",
        description: catalogSubject.description,
        color: catalogSubject.color,
        icon: catalogSubject.icon,
      },
    });

    const topic = await prisma.topic.upsert({
      where: {
        subjectId_slug: {
          subjectId: subject.id,
          slug: `${catalogSubject.slug}-nen-tang`,
        },
      },
      update: { name: catalogSubject.units[0].title },
      create: {
        subjectId: subject.id,
        slug: `${catalogSubject.slug}-nen-tang`,
        name: catalogSubject.units[0].title,
      },
    });

    for (const [variantIndex, variant] of practiceVariants.entries()) {
      const code = `CAT-${catalogSubject.slug.toUpperCase()}-${variant.suffix}`;
      await prisma.exam.upsert({
        where: { code },
        update: {
          title: `${variant.title} ${catalogSubject.name} 2026`,
          description: `BĂ i luyá»‡n ${catalogSubject.name} theo chuyĂªn Ä‘á», cĂ³ cháº¥m Ä‘iá»ƒm vĂ  cá»™ng EXP khi hoĂ n thĂ nh.`,
          durationMinutes: variant.durationMinutes,
          subjectId: subject.id,
        },
        create: {
          code,
          slug: `${catalogSubject.slug}-${variant.suffix.toLowerCase()}-2026`,
          title: `${variant.title} ${catalogSubject.name} 2026`,
          description: `BĂ i luyá»‡n ${catalogSubject.name} theo chuyĂªn Ä‘á», cĂ³ cháº¥m Ä‘iá»ƒm vĂ  cá»™ng EXP khi hoĂ n thĂ nh.`,
          family: "THPTQG",
          type: variant.type,
          accessLevel: "FREE",
          year: 2026,
          durationMinutes: variant.durationMinutes,
          targetScore: 8,
          subjectId: subject.id,
          questions: {
            create: {
              position: 1,
              type: "SINGLE_CHOICE",
              topicId: topic.id,
              prompt: catalogSubject.sampleQuestion.prompt,
              points: 1,
              explanation: catalogSubject.sampleQuestion.explanation,
              answerOptions: {
                create: catalogSubject.sampleQuestion.answers.map((content, answerIndex) => ({
                  label: String.fromCharCode(65 + answerIndex),
                  content,
                  isCorrect: answerIndex === catalogSubject.sampleQuestion.correctIndex,
                })),
              },
            },
          },
        },
      });

      if (variantIndex === 0) {
        await prisma.theoryArticle.upsert({
          where: { slug: `${catalogSubject.slug}-tong-quan` },
          update: {
            title: `Tá»•ng quan ${catalogSubject.name}`,
            summary: catalogSubject.description,
          },
          create: {
            subjectId: subject.id,
            slug: `${catalogSubject.slug}-tong-quan`,
            title: `Tá»•ng quan ${catalogSubject.name}`,
            summary: catalogSubject.description,
            content: catalogSubject.units
              .map((unit) => `${unit.title}: ${unit.lessons.join(", ")}.`)
              .join("\n\n"),
            accessLevel: "FREE",
          },
        });
      }
    }
  }

  for (const rule of Object.values(nationalExamRules)) {
    const catalogSubject = subjectLearningCatalog.find((item) => item.slug === rule.subjectSlug);
    if (!catalogSubject) continue;
    const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: rule.subjectSlug } });
    const code = `NAT-${rule.subjectSlug.toUpperCase()}-2026`;
    const exam = await prisma.exam.upsert({
      where: { code },
      update: {
        title: `Äá» chuáº©n THPTQG 2026 - ${subject.name}`,
        durationMinutes: rule.durationMinutes,
        educationLevel: "THPTQG",
        examStructure: rule,
        subjectId: subject.id,
      },
      create: {
        code,
        slug: `de-chuan-thptqg-2026-${rule.subjectSlug}`,
        title: `Äá» chuáº©n THPTQG 2026 - ${subject.name}`,
        description: `Äá» mĂ´ phá»ng Ä‘Ăºng thá»i gian vĂ  cáº¥u trĂºc cĂ¢u há»i THPTQG cá»§a mĂ´n ${subject.name}.`,
        family: "THPTQG",
        type: "MOCK",
        accessLevel: "FREE",
        year: 2026,
        durationMinutes: rule.durationMinutes,
        educationLevel: "THPTQG",
        examStructure: rule,
        targetScore: 8,
        subjectId: subject.id,
      },
      include: { _count: { select: { questions: true, attempts: true } } },
    });

    if (exam._count.questions !== getNationalQuestionCount(rule) && exam._count.attempts === 0) {
      await prisma.question.deleteMany({ where: { examId: exam.id } });
      let position = 1;
      for (const part of rule.parts) {
        for (let partIndex = 0; partIndex < part.count; partIndex += 1) {
          const baseQuestion = catalogSubject.sampleQuestion;
          if (part.questionType === "ESSAY") {
            await prisma.question.create({
              data: {
                examId: exam.id,
                position,
                type: "ESSAY",
                prompt: `${part.label} - CĂ¢u ${partIndex + 1}: TrĂ¬nh bĂ y ná»™i dung trá»ng tĂ¢m cá»§a ${catalogSubject.units[partIndex % catalogSubject.units.length].title}.`,
                points: part.pointsPerQuestion,
                explanation: "CĂ¢u tá»± luáº­n Ä‘Æ°á»£c giĂ¡o viĂªn cháº¥m theo hÆ°á»›ng dáº«n vĂ  thang Ä‘iá»ƒm.",
              },
            });
          } else if (part.questionType === "SHORT_ANSWER") {
            await prisma.question.create({
              data: {
                examId: exam.id,
                position,
                type: "SHORT_ANSWER",
                prompt: `${part.label} - CĂ¢u ${partIndex + 1}: Nháº­p Ä‘Ă¡p Ă¡n ngáº¯n phĂ¹ há»£p (Ä‘Ă¡p Ă¡n máº«u: 1).`,
                points: part.pointsPerQuestion,
                correctText: "1",
                explanation: "ÄĂ¡p Ă¡n máº«u cá»§a dá»¯ liá»‡u thá»­ nghiá»‡m lĂ  1.",
              },
            });
          } else {
            const options = part.questionType === "TRUE_FALSE_SET"
              ? ["Nháº­n Ä‘á»‹nh thá»© nháº¥t", "Nháº­n Ä‘á»‹nh thá»© hai", "Nháº­n Ä‘á»‹nh thá»© ba", "Nháº­n Ä‘á»‹nh thá»© tÆ°"]
              : [...baseQuestion.answers];
            await prisma.question.create({
              data: {
                examId: exam.id,
                position,
                type: part.questionType,
                prompt: part.questionType === "TRUE_FALSE_SET"
                  ? `${part.label} - CĂ¢u ${partIndex + 1}: XĂ¡c Ä‘á»‹nh Ä‘Ăºng hoáº·c sai cho tá»«ng nháº­n Ä‘á»‹nh.`
                  : `${part.label} - CĂ¢u ${partIndex + 1}: ${baseQuestion.prompt}`,
                points: part.pointsPerQuestion,
                explanation: baseQuestion.explanation,
                answerOptions: {
                  create: options.map((content, optionIndex) => ({
                    label: part.questionType === "TRUE_FALSE_SET" ? String.fromCharCode(97 + optionIndex) : String.fromCharCode(65 + optionIndex),
                    content,
                    isCorrect: part.questionType === "TRUE_FALSE_SET"
                      ? optionIndex % 2 === 0
                      : optionIndex === baseQuestion.correctIndex,
                  })),
                },
              },
            });
          }
          position += 1;
        }
      }
    }
  }

  await prisma.theoryArticle.upsert({
    where: { slug: "lich-su-viet-nam-1945-1975" },
    update: {},
    create: {
      subjectId: history.id,
      slug: "lich-su-viet-nam-1945-1975",
      title: "Khung ghi nhá»› Viá»‡t Nam 1945-1975",
      summary: "TĂ³m táº¯t má»‘c sá»± kiá»‡n, nguyĂªn nhĂ¢n, káº¿t quáº£ vĂ  Ă½ nghÄ©a.",
      content: "Chia giai Ä‘oáº¡n thĂ nh 1945-1954, 1954-1965 vĂ  1965-1975. Vá»›i má»—i giai Ä‘oáº¡n, ghi nhá»› bá»‘i cáº£nh, nhiá»‡m vá»¥ chiáº¿n lÆ°á»£c, sá»± kiá»‡n then chá»‘t vĂ  Ă½ nghÄ©a lá»‹ch sá»­.",
      accessLevel: "PRO"
    }
  });

  await prisma.blogPost.upsert({
    where: { slug: "chien-luoc-on-thi-30-ngay" },
    update: {},
    create: {
      slug: "chien-luoc-on-thi-30-ngay",
      title: "Chiáº¿n lÆ°á»£c Ă´n thi 30 ngĂ y",
      excerpt: "Má»™t cĂ¡ch chia thá»i gian thá»±c dá»¥ng: luyá»‡n Ä‘á», chá»¯a lá»—i, Ă´n láº¡i Ä‘iá»ƒm yáº¿u.",
      content: "Tuáº§n 1 dĂ¹ng Ä‘á»ƒ Ä‘o nÄƒng lá»±c vĂ  xĂ¡c Ä‘á»‹nh lá»— há»•ng. Tuáº§n 2-3 táº­p trung chá»¯a lá»—i theo chuyĂªn Ä‘á». Tuáº§n 4 mĂ´ phá»ng Ă¡p lá»±c phĂ²ng thi vĂ  rĂ  soĂ¡t cĂ¢u sai láº·p láº¡i.",
      status: "PUBLISHED",
      publishedAt: new Date()
    }
  });

  const activeSubscription = await prisma.subscription.findFirst({ where: { userId: demo.id, status: "ACTIVE" } });
  if (!activeSubscription) {
    await prisma.subscription.create({
      data: {
        userId: demo.id,
        planId: monthly.id,
        status: "ACTIVE",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      }
    });
  }

  const documentDirectory = path.join(process.cwd(), "public", "uploads", "documents");
  fs.mkdirSync(documentDirectory, { recursive: true });
  const sampleDocuments = [
    {
      title: "Sá»• tay cĂ´ng thá»©c ToĂ¡n lá»›p 6",
      description: "Tá»•ng há»£p cĂ¡c cĂ´ng thá»©c sá»‘ há»c, phĂ¢n sá»‘ vĂ  hĂ¬nh há»c cÆ¡ báº£n dĂ nh cho há»c sinh lá»›p 6.",
      level: "THCS" as const,
      grade: "Lá»›p 6",
      subject: "ToĂ¡n",
      type: "FORMULA_HANDBOOK" as const,
      storedName: "system-toan-lop-6.pdf",
      lines: ["SO TAY CONG THUC TOAN LOP 6", "Phan so - So nguyen - Hinh hoc co ban", "Tai lieu mau cua he thong SLOWEDU"],
    },
    {
      title: "TĂ³m táº¯t Ngá»¯ VÄƒn lá»›p 10",
      description: "SÆ¡ Ä‘á»“ kiáº¿n thá»©c trá»ng tĂ¢m, phÆ°Æ¡ng phĂ¡p Ä‘á»c hiá»ƒu vĂ  dĂ n Ă½ nghá»‹ luáº­n thÆ°á»ng gáº·p.",
      level: "THPT" as const,
      grade: "Lá»›p 10",
      subject: "Ngá»¯ VÄƒn",
      type: "THEORY_SUMMARY" as const,
      storedName: "system-ngu-van-lop-10.pdf",
      lines: ["TOM TAT NGU VAN LOP 10", "Doc hieu - Nghi luan xa hoi - Nghi luan van hoc", "Tai lieu mau cua he thong SLOWEDU"],
    },
    {
      title: "Äá» thi thá»­ ToĂ¡n THPTQG",
      description: "Äá» thi thá»­ mĂ´n ToĂ¡n theo cáº¥u trĂºc tá»‘t nghiá»‡p THPT, kĂ¨m Ä‘á»‹nh hÆ°á»›ng phĂ¢n bá»• thá»i gian.",
      level: "THPTQG" as const,
      grade: "MĂ´n thi",
      subject: "ToĂ¡n",
      type: "MOCK_EXAM" as const,
      storedName: "system-de-thi-thu-toan-thptqg.pdf",
      lines: ["DE THI THU TOAN THPTQG", "Thoi gian lam bai: 90 phut", "Tai lieu mau cua he thong SLOWEDU"],
    },
  ];

  for (const item of sampleDocuments) {
    const filePath = path.join(documentDirectory, item.storedName);
    createSamplePdf(filePath, item.title, item.lines);
    const fileSize = fs.statSync(filePath).size;
    await prisma.document.upsert({
      where: { storedName: item.storedName },
      update: { fileSize },
      create: {
        title: item.title,
        description: item.description,
        level: item.level,
        grade: item.grade,
        subject: item.subject,
        type: item.type,
        originalName: item.storedName,
        storedName: item.storedName,
        mimeType: "application/pdf",
        fileSize,
        status: "APPROVED",
        approvalRewarded: true,
        approvedAt: new Date(),
        uploaderId: admin.id,
      },
    });
  }

  console.log({ admin: admin.email, demo: demo.email, teacher: teacher.email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
