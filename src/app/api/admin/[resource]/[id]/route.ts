import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { parseAdminInput } from "@/lib/admin-input";
import { validateOfficialNationalExam } from "@/lib/official-exam-publication";
import { transitionManualPayment } from "@/lib/payment-transition";
import { handleRouteError, HttpError, jsonOk, readJson, requireAdmin } from "@/lib/api";

async function updateResource(resource: string, id: string, body: Record<string, unknown>) {
  switch (resource) {
    case "subjects":
      return prisma.subject.update({ where: { id }, data: body as never });
    case "exams":
      return prisma.$transaction(async (tx) => {
        const current = await tx.exam.findUnique({
          where: { id },
          include: {
            subject: { select: { slug: true } },
            questions: {
              select: {
                position: true, type: true, points: true, prompt: true, correctText: true,
                answerOptions: { select: { isCorrect: true } },
              },
            },
          },
        });
        if (!current) throw new HttpError(404, "Không tìm thấy đề thi.");
        const nextLevel = body.educationLevel === undefined
          ? current.educationLevel : body.educationLevel as string | null;
        const nextPublished = body.isPublished === undefined
          ? current.isPublished : body.isPublished === true;
        const nextSubjectId = typeof body.subjectId === "string" ? body.subjectId : current.subjectId;
        const nextSubject = nextSubjectId === current.subjectId
          ? current.subject
          : await tx.subject.findUnique({ where: { id: nextSubjectId }, select: { slug: true } });
        if (!nextSubject) throw new HttpError(404, "Không tìm thấy môn học.");
        let structure: unknown | undefined;
        if (current.ownerId === null && nextPublished && nextLevel === "THPTQG") {
          try {
            structure = validateOfficialNationalExam({
              educationLevel: nextLevel,
              subjectSlug: nextSubject.slug,
              durationMinutes: typeof body.durationMinutes === "number" ? body.durationMinutes : current.durationMinutes,
              questions: current.questions,
            });
          } catch (error) {
            throw new HttpError(400, error instanceof Error ? error.message : "Cấu trúc đề THPTQG không hợp lệ.");
          }
        }
        // Preserve metadata on ordinary admin exams. Only official
        // THPTQG transitions should replace/clear the official structure.
        if (structure === undefined &&
            current.ownerId === null &&
            (current.educationLevel === "THPTQG" || nextLevel === "THPTQG")) {
          structure = Prisma.DbNull;
        }
        return tx.exam.update({
          where: { id },
          data: (structure === undefined ? body : { ...body, examStructure: structure }) as never,
        });
      }, { isolationLevel: "Serializable" });
    case "questions": {
      const existing = await prisma.question.findUnique({ where: { id }, select: { examId: true } });
      if (!existing) throw new HttpError(404, "Không tìm thấy câu hỏi.");
      const examIds = Array.from(new Set([existing.examId, typeof body.examId === "string" ? body.examId : existing.examId]));
      const exams = await prisma.exam.findMany({ where: { id: { in: examIds } }, select: { ownerId: true, educationLevel: true, isPublished: true } });
      if (exams.some((exam) => exam.ownerId === null && exam.educationLevel === "THPTQG" && exam.isPublished)) {
        throw new HttpError(409, "Hãy chuyển đề THPTQG về bản nháp trước khi sửa hoặc chuyển câu hỏi.");
      }
      const { answerOptions, ...question } = body;
      if (Array.isArray(answerOptions)) {
        await prisma.answerOption.deleteMany({ where: { questionId: id } });
        return prisma.question.update({
          where: { id },
          data: { ...question, answerOptions: { create: answerOptions as never } } as never
        });
      }
      return prisma.question.update({ where: { id }, data: question as never });
    }
    case "blogs":
      return prisma.blogPost.update({ where: { id }, data: body as never });
    case "users":
      return prisma.user.update({ where: { id }, data: body as never, select: { id: true, email: true, name: true, role: true } });
    case "subscriptions":
      return prisma.subscription.update({ where: { id }, data: body as never });
    case "payments":
      return (await transitionManualPayment(prisma, id, String(body.status))).payment;
    case "plans":
      return prisma.plan.update({ where: { id }, data: body as never });
    case "store-items":
      return prisma.storeItem.update({ where: { id }, data: body as never });
    case "theory-chapters":
      return prisma.theoryChapter.update({ where: { id }, data: body as never });
    case "theory-lessons":
      return prisma.theoryLesson.update({ where: { id }, data: body as never });
    default:
      throw new HttpError(404, "Admin resource not found");
  }
}

async function getResource(resource: string, id: string) {
  switch (resource) {
    case "subjects":
      return prisma.subject.findUnique({ where: { id } });
    case "exams":
      return prisma.exam.findUnique({ where: { id }, include: { subject: true, _count: { select: { questions: true, attempts: true } } } });
    case "questions":
      return prisma.question.findUnique({ where: { id }, include: { exam: true, topic: true, answerOptions: true } });
    case "blogs":
      return prisma.blogPost.findUnique({ where: { id } });
    case "users":
      return prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true, createdAt: true, profile: true } });
    case "subscriptions":
      return prisma.subscription.findUnique({ where: { id }, include: { user: { select: { id: true, email: true, name: true, role: true } }, plan: true } });
    case "payments":
      return prisma.payment.findUnique({ where: { id }, include: { user: { select: { id: true, name: true, email: true, role: true } }, plan: true } });
    case "plans":
      return prisma.plan.findUnique({ where: { id } });
    case "store-items":
      return prisma.storeItem.findUnique({ where: { id } });
    case "theory-chapters":
      return prisma.theoryChapter.findUnique({ where: { id }, include: { subject: true, _count: { select: { lessons: true } } } });
    case "theory-lessons":
      return prisma.theoryLesson.findUnique({ where: { id }, include: { chapter: { include: { subject: true } } } });
    default:
      throw new HttpError(404, "Admin resource not found");
  }
}

async function deleteResource(resource: string, id: string) {
  switch (resource) {
    case "subjects":
      return prisma.subject.delete({ where: { id } });
    case "exams":
      return prisma.exam.delete({ where: { id } });
    case "questions": {
      const question = await prisma.question.findUnique({
        where: { id }, select: { exam: { select: { ownerId: true, educationLevel: true, isPublished: true } } },
      });
      if (question?.exam.ownerId === null && question.exam.educationLevel === "THPTQG" && question.exam.isPublished) {
        throw new HttpError(409, "Hãy chuyển đề THPTQG về bản nháp trước khi xóa câu hỏi.");
      }
      return prisma.question.delete({ where: { id } });
    }
    case "blogs":
      return prisma.blogPost.delete({ where: { id } });
    case "users":
      return prisma.user.delete({ where: { id } });
    case "subscriptions":
      return prisma.subscription.delete({ where: { id } });
    case "payments":
      throw new HttpError(409, "Payment audit records cannot be deleted");
    case "plans":
      return prisma.plan.delete({ where: { id } });
    case "store-items":
      return prisma.storeItem.delete({ where: { id } });
    case "theory-chapters":
      return prisma.theoryChapter.delete({ where: { id } });
    case "theory-lessons":
      return prisma.theoryLesson.delete({ where: { id } });
    default:
      throw new HttpError(404, "Admin resource not found");
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await params;
    await requireAdmin();
    const item = await getResource(resource, id);
    if (!item) throw new HttpError(404, "Admin item not found");
    return jsonOk({ item });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await params;
    await requireAdmin();
    const input = await readJson<unknown>(request);
    const body = parseAdminInput(resource, input, "update");
    const item = await updateResource(resource, id, body);
    return jsonOk({ item });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await params;
    await requireAdmin();
    const item = await deleteResource(resource, id);
    return jsonOk({ item });
  } catch (error) {
    return handleRouteError(error);
  }
}
