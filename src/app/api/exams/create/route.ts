import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
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

    const exam = await prisma.exam.create({
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
        // User/teacher-created practice exams never claim to be official national exam templates.
        examStructure: undefined,
        subjectId: subject.id,
        ownerId: user.id,
        shareToken,
        shareMode: payload.shareMode,
        sharePasswordHash,
        isPublished: true,
        accessGrants: allowedEmails.length
          ? { create: allowedEmails.map((email) => ({ email })) }
          : undefined,
        questions: {
          create: payload.questions.map((question, index) => {
            return {
              position: index + 1,
              type: "SINGLE_CHOICE" as const,
              prompt: question.prompt,
              points: 1,
              explanation: question.explanation || null,
              answerOptions: {
                create: question.options.map((content, optionIndex) => ({
                  label: String.fromCharCode(65 + optionIndex),
                  content,
                  isCorrect: optionIndex === question.correctIndex,
                })),
              },
            };
          }),
        },
      },
      select: { id: true, slug: true, shareToken: true },
    });

    return jsonOk({ exam }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
