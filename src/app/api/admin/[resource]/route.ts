import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { parseAdminInput } from "@/lib/admin-input";
import { gradeToLevel } from "@/lib/theory-admin";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireAdmin } from "@/lib/api";

async function listResource(resource: string) {
  switch (resource) {
    case "subjects":
      return prisma.subject.findMany({ include: { _count: { select: { exams: true } } }, orderBy: { createdAt: "desc" } });
    case "exams":
      return prisma.exam.findMany({ where: { ownerId: null }, include: { subject: true, _count: { select: { questions: true, attempts: true } } }, orderBy: { createdAt: "desc" } });
    case "questions":
      return prisma.question.findMany({ include: { exam: true, topic: true, answerOptions: true }, orderBy: [{ examId: "asc" }, { position: "asc" }] });
    case "blogs":
      return prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
    case "users":
      return prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true, profile: true }, orderBy: { createdAt: "desc" } });
    case "subscriptions":
      return prisma.subscription.findMany({ include: { user: { select: { id: true, email: true, name: true, role: true } }, plan: true }, orderBy: { createdAt: "desc" } });
    case "payments":
      return prisma.payment.findMany({ include: { user: { select: { id: true, email: true, name: true, role: true } }, plan: true }, orderBy: { createdAt: "desc" } });
    case "plans":
      return prisma.plan.findMany({ orderBy: [{ price: "asc" }, { createdAt: "asc" }] });
    case "store-items":
      return prisma.storeItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
    case "theory-chapters":
      return prisma.theoryChapter.findMany({ include: { subject: true, _count: { select: { lessons: true } } }, orderBy: [{ position: "asc" }, { createdAt: "desc" }] });
    case "theory-lessons":
      return prisma.theoryLesson.findMany({ include: { chapter: { include: { subject: true } } }, orderBy: [{ position: "asc" }, { createdAt: "desc" }] });
    default:
      throw new HttpError(404, "Admin resource not found");
  }
}

async function createResource(resource: string, body: Record<string, unknown>) {
  switch (resource) {
    case "subjects":
      return prisma.subject.create({ data: body as never });
    case "exams":
      // Admin enters questions in the separate question editor, so a national
      // exam must start unpublished and be checked on publication.
      if (body.educationLevel === "THPTQG" && body.isPublished !== false) {
        throw new HttpError(400, "Hãy tạo đề THPTQG ở trạng thái nháp (isPublished: false), nhập đủ câu theo cấu trúc rồi mới xuất bản.");
      }
      return prisma.exam.create({ data: body as never });
    case "questions": {
      const examId = String(body.examId ?? "");
      const target = await prisma.exam.findUnique({
        where: { id: examId },
        select: { ownerId: true, educationLevel: true, isPublished: true },
      });
      if (target?.ownerId === null && target.educationLevel === "THPTQG" && target.isPublished) {
        throw new HttpError(409, "Hãy chuyển đề THPTQG về bản nháp trước khi chỉnh sửa câu hỏi.");
      }
      const { answerOptions, ...question } = body;
      return prisma.question.create({
        data: {
          ...question,
          answerOptions: Array.isArray(answerOptions) ? { create: answerOptions as never } : undefined
        } as never
      });
    }
    case "blogs":
      return prisma.blogPost.create({ data: body as never });
    case "users": {
      const password = typeof body.password === "string" ? body.password : "";
      if (password.length < 8) throw new HttpError(400, "Mật khẩu phải có ít nhất 8 ký tự");
      return prisma.user.create({
        data: {
          email: String(body.email),
          name: typeof body.name === "string" ? body.name : null,
          role: body.role === "ADMIN" ? "ADMIN" : body.role === "TEACHER" ? "TEACHER" : "STUDENT",
          passwordHash: await bcrypt.hash(password, 12)
        },
        select: { id: true, email: true, name: true, role: true }
      });
    }
    case "subscriptions":
      return prisma.subscription.create({ data: body as never });
    case "payments":
      return prisma.payment.create({ data: body as never });
    case "plans":
      return prisma.plan.create({ data: body as never });
    case "store-items":
      return prisma.storeItem.create({ data: body as never });
    case "theory-chapters": {
      const grade = String(body.grade ?? "");
      if (grade && gradeToLevel(grade) !== body.educationLevel) {
        throw new HttpError(400, "Lớp và cấp học không khớp.");
      }
      return prisma.theoryChapter.create({ data: body as never });
    }
    case "theory-lessons":
      return prisma.theoryLesson.create({ data: body as never });
    default:
      throw new HttpError(404, "Admin resource not found");
  }
}

// Paginated, filterable lists for the human-friendly admin editors. The
// original endpoint remains unchanged for other screens using the v1 API.
async function listManagedResource(resource: string, searchParams: URLSearchParams) {
  const page = Math.min(100000, Math.max(1, Number(searchParams.get("page")) || 1));
  const requested = Number(searchParams.get("pageSize")) || 30;
  const take = Math.min(100, Math.max(1, Math.trunc(requested)));
  const skip = (page - 1) * take;
  const query = (searchParams.get("q") ?? "").trim().slice(0, 120);

  if (resource === "exams") {
    const level = searchParams.get("level");
    const subjectId = searchParams.get("subjectId");
    const where: Prisma.ExamWhereInput = {
      ownerId: null,
      ...(query ? { OR: [
        { title: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
      ] } : {}),
      ...(level && ["THCS", "THPT", "EXAM_10", "THPTQG"].includes(level)
        ? { educationLevel: level as "THCS" | "THPT" | "EXAM_10" | "THPTQG" } : {}),
      ...(subjectId ? { subjectId } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.exam.findMany({
        where, skip, take, orderBy: { createdAt: "desc" },
        select: {
          id: true, code: true, slug: true, title: true, description: true,
          family: true, type: true, accessLevel: true, year: true,
          durationMinutes: true, educationLevel: true, targetScore: true,
          subjectId: true, isPublished: true, ownerId: true, createdAt: true,
          subject: { select: { id: true, name: true, family: true } },
          _count: { select: { questions: true, attempts: true } },
        },
      }),
      prisma.exam.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  if (resource === "questions") {
    const examId = searchParams.get("examId");
    if (!examId) return { items: [], total: 0, page, pageSize: take };
    const where: Prisma.QuestionWhereInput = {
      examId,
      ...(query ? { prompt: { contains: query, mode: "insensitive" } } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.question.findMany({
        where, skip, take, orderBy: [{ position: "asc" }, { id: "asc" }],
        select: {
          id: true, examId: true, position: true, type: true,
          prompt: true, passage: true, points: true, correctText: true,
          explanation: true,
          answerOptions: { select: { label: true, content: true, isCorrect: true }, orderBy: { label: "asc" } },
        },
      }),
      prisma.question.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  throw new HttpError(404, "Admin resource not found");
}

export async function GET(_request: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await params;
    await requireAdmin();
    const searchParams = new URL(_request.url).searchParams;
    if (searchParams.get("managed") === "1" && (resource === "exams" || resource === "questions")) {
      return jsonOk(await listManagedResource(resource, searchParams));
    }
    const items = await listResource(resource);
    return jsonOk({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await params;
    await requireAdmin();
    const input = await readJson<unknown>(request);
    const body = parseAdminInput(resource, input, "create");
    const item = await createResource(resource, body);
    return jsonOk({ item }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
