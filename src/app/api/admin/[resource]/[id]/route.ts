import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireAdmin } from "@/lib/api";

async function updateResource(resource: string, id: string, body: Record<string, unknown>) {
  switch (resource) {
    case "subjects":
      return prisma.subject.update({ where: { id }, data: body as never });
    case "exams":
      return prisma.exam.update({ where: { id }, data: body as never });
    case "questions": {
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
      return prisma.payment.update({ where: { id }, data: body as never });
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
      return prisma.subscription.findUnique({ where: { id }, include: { user: true, plan: true } });
    case "payments":
      return prisma.payment.findUnique({ where: { id }, include: { user: true, plan: true } });
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
    case "questions":
      return prisma.question.delete({ where: { id } });
    case "blogs":
      return prisma.blogPost.delete({ where: { id } });
    case "users":
      return prisma.user.delete({ where: { id } });
    case "subscriptions":
      return prisma.subscription.delete({ where: { id } });
    case "payments":
      return prisma.payment.delete({ where: { id } });
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
    const body = await readJson<Record<string, unknown>>(request);
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
