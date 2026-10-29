import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exam = await prisma.exam.findFirst({
      where: { OR: [{ id }, { slug: id }, { code: id }], isPublished: true },
      include: {
        subject: true,
        questions: {
          orderBy: { position: "asc" },
          include: { answerOptions: { orderBy: { label: "asc" } }, topic: true }
        }
      }
    });

    if (!exam) throw new HttpError(404, "Exam not found");

    return jsonOk({
      exam: {
        id: exam.id,
        code: exam.code,
        slug: exam.slug,
        title: exam.title,
        description: exam.description,
        family: exam.family,
        type: exam.type,
        accessLevel: exam.accessLevel,
        year: exam.year,
        durationMinutes: exam.durationMinutes,
        educationLevel: exam.educationLevel,
        examStructure: exam.examStructure,
        targetScore: exam.targetScore,
        subject: exam.subject,
        questions: exam.questions.map((question) => ({
          id: question.id,
          topic: question.topic,
          position: question.position,
          type: question.type,
          prompt: question.prompt,
          passage: question.passage,
          points: question.points,
          answerOptions: question.answerOptions.map((option) => ({ id: option.id, label: option.label, content: option.content }))
        }))
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
