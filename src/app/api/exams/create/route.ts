import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireUser } from "@/lib/api";
import { getNationalExamRule, getNationalQuestionCount } from "@/lib/national-exam-rules";

const questionSchema = z.object({
  prompt: z.string().trim().min(3),
  options: z.array(z.string().trim().min(1)).min(2).max(6),
  correctIndex: z.number().int().min(0),
  explanation: z.string().trim().optional(),
});

const createExamSchema = z.object({
  title: z.string().trim().min(3).max(160),
  subjectId: z.string().min(1),
  educationLevel: z.enum(["THCS", "THPT", "EXAM_10", "THPTQG"]),
  durationMinutes: z.number().int().min(5).max(300),
  questions: z.array(questionSchema).min(1).max(100),
  shareMode: z.enum(["PUBLIC", "PASSWORD", "RESTRICTED"]).default("PUBLIC"),
  sharePassword: z.string().trim().optional(),
  allowedEmails: z.array(z.string().trim().email()).default([]),
});

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
    const payload = createExamSchema.parse(await readJson<unknown>(request));
    const subject = await prisma.subject.findUnique({ where: { id: payload.subjectId } });
    if (!subject) throw new HttpError(404, "Không tìm thấy môn học.");
    const nationalRule = payload.educationLevel === "THPTQG" ? getNationalExamRule(subject.slug) : undefined;
    if (payload.educationLevel === "THPTQG" && !nationalRule) {
      throw new HttpError(400, "Môn học chưa có cấu trúc THPTQG được quy định.");
    }
    if (payload.shareMode === "PASSWORD" && !payload.sharePassword) {
      throw new HttpError(400, "Vui lòng nhập mật khẩu cho đề thi.");
    }
    if (nationalRule && payload.questions.length !== getNationalQuestionCount(nationalRule)) {
      throw new HttpError(400, `Đề ${subject.name} THPTQG cần đúng ${getNationalQuestionCount(nationalRule)} câu.`);
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
        durationMinutes: nationalRule?.durationMinutes ?? payload.durationMinutes,
        educationLevel: payload.educationLevel,
        examStructure: nationalRule ?? undefined,
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
            let type: "SINGLE_CHOICE" | "TRUE_FALSE_SET" | "SHORT_ANSWER" = "SINGLE_CHOICE";
            let points = 1;
            if (nationalRule) {
              let cursor = 0;
              const part = nationalRule.parts.find((item) => {
                cursor += item.count;
                return index < cursor;
              });
              if (part && part.questionType !== "ESSAY") {
                type = part.questionType;
                points = part.pointsPerQuestion;
              }
            }
            return {
              position: index + 1,
              type,
              prompt: question.prompt,
              points,
              correctText: type === "SHORT_ANSWER" ? question.options[question.correctIndex] : null,
              explanation: question.explanation || null,
              answerOptions: type === "SHORT_ANSWER" ? undefined : {
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
