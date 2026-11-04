import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireAdmin } from "@/lib/api";
import { readLimitedJson } from "@/lib/limited-json";

const schema = z.object({
  grade: z.enum(["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9", "Lớp 10", "Lớp 11", "Lớp 12", "Ôn thi vào 10", "Ôn thi THPTQG"]),
  subjectId: z.string().min(1), title: z.string().trim().min(3).max(250), description: z.string().max(20000),
  durationMinutes: z.number().int().min(1).max(600), accessLevel: z.enum(["FREE", "PRO"]),
  questions: z.array(z.object({ prompt: z.string().trim().min(1).max(50000), options: z.array(z.string().trim().min(1).max(20000)).min(2).max(6), correctIndex: z.number().int().nonnegative(), explanation: z.string().max(50000) }).strict()).min(1).max(2000),
}).strict();

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = schema.parse(await readLimitedJson(request, 8 * 1024 * 1024));
    const subject = await prisma.subject.findUnique({ where: { id: input.subjectId } });
    if (!subject) throw new HttpError(404, "Không tìm thấy môn học.");
    if (input.grade === "Ôn thi THPTQG" && subject.family !== "THPTQG") throw new HttpError(400, "Môn học không thuộc ôn thi THPTQG.");
    if (input.questions.some((question) => question.correctIndex >= question.options.length)) throw new HttpError(400, "Đáp án đúng không hợp lệ.");
    const level = input.grade === "Ôn thi THPTQG" ? "THPTQG" : input.grade === "Ôn thi vào 10" ? "EXAM_10" : Number(input.grade.slice(4)) <= 9 ? "THCS" : "THPT";
    const suffix = randomUUID().replace(/-/g, "").slice(0, 16);
    const exam = await prisma.$transaction(async (tx) => {
      const created = await tx.exam.create({ data: { code: `ADMIN-${suffix}`, slug: `admin-${suffix}`, title: input.title, description: input.description, family: subject.family, type: "MOCK", accessLevel: input.accessLevel, year: new Date().getFullYear(), durationMinutes: input.durationMinutes, educationLevel: level, grade: input.grade === "Ôn thi vào 10" || input.grade === "Ôn thi THPTQG" ? "Môn thi" : input.grade, subjectId: subject.id, isPublished: false } });
      for (let start = 0; start < input.questions.length; start += 100) {
        const chunk = input.questions.slice(start, start + 100).map((question, index) => ({ ...question, id: randomUUID(), position: start + index + 1 }));
        await tx.question.createMany({ data: chunk.map((question) => ({ id: question.id, examId: created.id, position: question.position, type: "SINGLE_CHOICE", prompt: question.prompt, explanation: question.explanation || null, points: 1 })) });
        await tx.answerOption.createMany({ data: chunk.flatMap((question) => question.options.map((content, index) => ({ questionId: question.id, label: String.fromCharCode(65 + index), content, isCorrect: index === question.correctIndex }))) });
      }
      return created;
    }, { maxWait: 10000, timeout: 120000 });
    return jsonOk({ exam }, 201);
  } catch (error) { return handleRouteError(error); }
}
