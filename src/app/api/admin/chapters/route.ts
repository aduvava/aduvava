import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, jsonOk, handleRouteError, HttpError } from "@/lib/api";
import { readLimitedJson } from "@/lib/limited-json";
import { learningGrades, learningContext } from "@/lib/learning-context";
const schema = z.object({ subjectId: z.string().min(1), grade: z.enum(learningGrades), title: z.string().trim().min(1).max(180), position: z.number().int().min(0).max(10000).default(0) }).strict();
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = schema.parse(await readLimitedJson(request, 8192));
    const subject = await prisma.subject.findUnique({ where: { id: input.subjectId } });
    if (!subject) throw new HttpError(404, "Không tìm thấy môn học.");
    const item = await prisma.theoryChapter.create({ data: { subjectId: input.subjectId, ...learningContext(input.grade), title: input.title, position: input.position, slug: `chuong-${randomUUID()}`, isPublished: true } });
    return jsonOk({ item }, 201);
  } catch (error) { return handleRouteError(error); }
}
