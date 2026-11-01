import { prisma } from "@/lib/db";
import { canAccessExam } from "@/lib/access";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";

// An exam's share token, password hash, answer keys and explanations must
// never appear in a pre-submission student response.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const exam = await prisma.exam.findFirst({
      where: { OR: [{ id }, { slug: id }, { code: id }], isPublished: true },
      select: {
        id: true, code: true, slug: true, title: true, description: true,
        family: true, type: true, accessLevel: true, year: true,
        durationMinutes: true, educationLevel: true, examStructure: true,
        subjectId: true, ownerId: true, shareMode: true,
        subject: true,
        questions: {
          orderBy: { position: "asc" },
          select: {
            id: true, position: true, type: true, prompt: true, passage: true,
            points: true, topic: true,
            answerOptions: {
              orderBy: { label: "asc" },
              select: { id: true, label: true, content: true },
            },
          },
        },
      },
    });
    if (!exam) throw new HttpError(404, "Exam not found");
    if (!(await canAccessExam(user.id, exam))) {
      throw new HttpError(403, "You do not have access to this exam");
    }

    return jsonOk({ exam });
  } catch (error) {
    return handleRouteError(error);
  }
}
