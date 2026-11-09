import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";
import { rateLimitOperation } from "@/lib/security-throttle";
import { readLimitedJson } from "@/lib/limited-json";
import { createExamSchema } from "@/lib/exam-create-input";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    // Apply the persistent account/IP/global throttle before parsing potentially large input.
    await rateLimitOperation(prisma, "exam-create", user.id, request.headers);
    const payload = createExamSchema.parse(await readLimitedJson(request, 8 * 1024 * 1024));
    const subject = await prisma.subject.findUnique({ where: { id: payload.subjectId } });
    if (!subject) throw new HttpError(404, "Không tìm thấy môn học.");
    if (payload.shareMode === "PASSWORD" && (!payload.sharePassword || Buffer.byteLength(payload.sharePassword, "utf8") > 72 || payload.sharePassword.length < 8)) {
      throw new HttpError(400, "Vui lòng nhập mật khẩu cho đề thi.");
    }
    for (const question of payload.questions) {
      if (question.correctIndex >= question.options.length) {
        throw new HttpError(400, "Đáp án đúng không hợp lệ.");
      }
    }

    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const slug = `${slugify(payload.title) || "de-thi"}-${suffix}`;
    const code = `USER-${suffix.toUpperCase()}`;
    const shareToken = randomBytes(16).toString("hex");
    const sharePasswordHash = payload.shareMode === "PASSWORD" && payload.sharePassword
      ? await bcrypt.hash(payload.sharePassword, 12)
      : null;
    const allowedEmails = Array.from(new Set(payload.allowedEmails.map((email) => email.toLowerCase())));

    // Bulk-create in chunks to avoid a giant Prisma nested insert for large
    // personal question banks, while keeping exam + options all-or-nothing.
    const exam = await prisma.$transaction(async (tx) => {
      const created = await tx.exam.create({
        data: {
          code,
          slug,
          title: payload.title,
          description: `Đề luyện tập do ${user.name ?? user.email ?? "học viên"} tạo.`,
          family: subject.family,
          type: "PRACTICE",
          accessLevel: "FREE",
          year: new Date().getFullYear(),
          durationMinutes: payload.durationMinutes,
          educationLevel: payload.educationLevel,
          // A user-created THPTQG practice paper is NOT an official structured exam.
          subjectId: subject.id,
          ownerId: user.id,
          shareToken,
          shareMode: payload.shareMode,
          sharePasswordHash,
          isPublished: true,
          accessGrants: allowedEmails.length
            ? { create: allowedEmails.map((email) => ({ email })) }
            : undefined,
        },
        select: { id: true, slug: true, shareToken: true },
      });

      const QUESTION_BATCH_SIZE = 100;
      const OPTION_BATCH_SIZE = 500;
      for (let start = 0; start < payload.questions.length; start += QUESTION_BATCH_SIZE) {
        const chunk = payload.questions.slice(start, start + QUESTION_BATCH_SIZE).map((question, index) => ({
          ...question,
          id: randomUUID(),
          position: start + index + 1,
        }));
        await tx.question.createMany({
          data: chunk.map((question) => ({
            id: question.id,
            examId: created.id,
            position: question.position,
            type: "SINGLE_CHOICE" as const,
            prompt: question.prompt,
            passage: question.passage || null,
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
        for (let optionStart = 0; optionStart < options.length; optionStart += OPTION_BATCH_SIZE) {
          await tx.answerOption.createMany({ data: options.slice(optionStart, optionStart + OPTION_BATCH_SIZE) });
        }
      }
      return created;
    }, { maxWait: 10000, timeout: 120000 });

    return jsonOk({ exam }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
