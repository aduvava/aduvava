import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireAdmin } from "@/lib/api";
import { readLimitedJson } from "@/lib/limited-json";
import { parseAdminInput } from "@/lib/admin-input";
import { createExamSchema } from "@/lib/exam-create-input";

const importSchema = z.object({
  metadata: z.record(z.string(), z.unknown()),
  questions: createExamSchema.shape.questions.min(1).max(2000),
}).strict();

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const payload = importSchema.parse(await readLimitedJson(request, 8 * 1024 * 1024));
    const metadata = parseAdminInput("exams", payload.metadata, "create");
    if (!metadata.title || !metadata.code || !metadata.slug || !metadata.subjectId ||
        !metadata.durationMinutes || !metadata.year) {
      throw new HttpError(400, "Thiếu thông tin đề thi: tên, mã, đường dẫn, môn, thời gian hoặc năm.");
    }
    if (metadata.specialExamTrack && metadata.educationLevel !== null) {
      throw new HttpError(400, "Đề kỳ thi riêng phải chọn cấp học: Không phân loại.");
    }
    if (payload.questions.some((question) => question.options.length !== 4 ||
        question.correctIndex >= question.options.length)) {
      throw new HttpError(400, "Mỗi câu cần đúng 4 đáp án và một đáp án đúng.");
    }
    const subject = await prisma.subject.findUnique({
      where: { id: String(metadata.subjectId) },
      select: { family: true },
    });
    if (!subject || metadata.family !== subject.family) {
      throw new HttpError(400, "Môn học không tồn tại hoặc không khớp nhóm môn.");
    }
    // Official THPTQG exams may contain more than single-choice questions.
    // Do not bypass the official publication validator with a spreadsheet.
    if (metadata.educationLevel === "THPTQG" && metadata.isPublished === true) {
      throw new HttpError(400, "Đề THPTQG phải được kiểm tra đủ cấu trúc chính thức trước khi xuất bản. Hãy bỏ chọn Xuất bản.");
    }

    const exam = await prisma.$transaction(async (tx) => {
      const created = await tx.exam.create({
        data: { ...metadata, ownerId: null, isPublished: metadata.isPublished === true } as never,
        select: { id: true, slug: true },
      });
      for (let start = 0; start < payload.questions.length; start += 100) {
        const chunk = payload.questions.slice(start, start + 100).map((question, index) => ({
          ...question, id: randomUUID(), position: start + index + 1,
        }));
        await tx.question.createMany({
          data: chunk.map((question) => ({
            id: question.id,
            examId: created.id,
            position: question.position,
            type: "SINGLE_CHOICE" as const,
            prompt: question.prompt,
            points: 1,
            explanation: question.explanation || null,
          })),
        });
        const options = chunk.flatMap((question) => question.options.map((content, index) => ({
          questionId: question.id,
          label: String.fromCharCode(65 + index),
          content,
          isCorrect: index === question.correctIndex,
        })));
        for (let offset = 0; offset < options.length; offset += 500) {
          await tx.answerOption.createMany({ data: options.slice(offset, offset + 500) });
        }
      }
      return created;
    }, { maxWait: 10000, timeout: 120000 });

    return jsonOk({ exam, questionCount: payload.questions.length }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
