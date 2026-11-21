import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireAdmin } from "@/lib/api";
import { readLimitedJson } from "@/lib/limited-json";
import { fitsExamRichField } from "@/lib/rich-image-security";
import { flattenAssessmentBlocks, getAssessmentRule, getAssessmentVariant } from "@/lib/special-exam-rules";
import { validateOfficialSpecialExam } from "@/lib/official-special-exam-publication";

const rich = (max: number) => z.string().trim().min(1).refine((text) => fitsExamRichField(text, max), "Nội dung quá dài hoặc hình không hợp lệ");
const optionalRich = (max: number) => z.string().trim().refine((text) => fitsExamRichField(text, max), "Nội dung quá dài hoặc hình không hợp lệ").optional();
const questionSchema = z.object({
  type: z.enum(["SINGLE_CHOICE", "SHORT_ANSWER", "TRUE_FALSE_SET", "ESSAY"]).optional(),
  blockKey: z.string().max(35).optional(),
  prompt: rich(2500),
  passage: optionalRich(50000),
  explanation: optionalRich(2000),
  // Blank choices are retained only in UNPUBLISHED drafts, never considered valid for publishing.
  options: z.array(z.string().trim().max(450000).refine((value) => !value || fitsExamRichField(value, 1200), "Phương án quá dài hoặc ảnh không hợp lệ")).max(4).optional(),
  correct: z.enum(["A", "B", "C", "D"]).optional(),
  correctIndex: z.number().int().min(0).max(3).optional(),
  correctText: optionalRich(500),
  statements: z.array(z.object({ content: rich(1000), isCorrect: z.boolean() }).strict()).max(4).optional(),
}).strict();
const requestSchema = z.object({
  metadata: z.object({
    title: z.string().trim().min(5).max(250),
    description: z.string().trim().max(20000).default(""),
    subjectId: z.string().min(1).max(128),
    track: z.enum(["HSA", "TSA", "V_ACT", "QDA", "DGNL_BCA"]),
    variantId: z.string().min(1).max(35),
    year: z.number().int().min(2020).max(2200),
    accessLevel: z.enum(["FREE", "PRO"]).default("FREE"),
  }).strict(),
  questions: z.array(questionSchema).min(1).max(200),
}).strict();

type Imported = {
  position: number; type: "SINGLE_CHOICE" | "TRUE_FALSE_SET" | "SHORT_ANSWER" | "ESSAY";
  prompt: string; passage: string | null; explanation: string | null;
  correctText: string | null; points: number;
  answerOptions: { label: string; content: string; isCorrect: boolean }[];
};

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const payload = requestSchema.parse(await readLimitedJson(request, 8 * 1024 * 1024));
    const { metadata } = payload;
    const rule = getAssessmentRule(metadata.track);
    const variant = getAssessmentVariant(metadata.track, metadata.variantId);
    if (!rule || !variant || variant.id !== metadata.variantId) {
      throw new HttpError(400, "Tổ hợp/mã bài thi ĐGNL không hợp lệ.");
    }
    const blocks = flattenAssessmentBlocks(variant);
    const requiredCount = blocks.reduce((sum, block) => sum + block.count, 0);
    const importWarnings: string[] = [];
    if (payload.questions.length !== requiredCount) {
      importWarnings.push("Đề " + metadata.track + " cần đúng " + requiredCount +
        " câu, file chỉ có " + payload.questions.length + " câu.");
    }
    const prepared: Imported[] = payload.questions.map((input, index) => {
      const position = index + 1;
      const block = blocks.find((item) => position >= item.start && position <= item.end);
      if (!block) throw new HttpError(400, "Không tìm thấy phần cho câu " + position + ".");
      if (input.blockKey && input.blockKey !== block.key) {
        throw new HttpError(400, "Câu " + position + " gắn sai phần, phải là " + block.key + ".");
      }
      const type = input.type ?? block.questionType;
      if (!(block.allowedTypes ?? [block.questionType]).includes(type)) {
        throw new HttpError(400, "Câu " + position + " sai dạng câu so với " + block.label + ".");
      }
      let answerOptions: Imported["answerOptions"] = [];
      let correctText: string | null = null;
      if (type === "SINGLE_CHOICE") {
        const options = input.options ?? [];
        const correctIndex = input.correctIndex ?? (input.correct ? input.correct.charCodeAt(0) - 65 : -1);
        if (options.length !== 4 || options.some((content) => !content.trim())) {
          importWarnings.push("Câu " + position + " thiếu phương án trắc nghiệm A–D.");
        }
        if (correctIndex < 0 || correctIndex > 3 || !options[correctIndex]?.trim()) {
          importWarnings.push("Câu " + position + " cần kiểm tra lại đáp án đúng.");
        }
        answerOptions = options.flatMap((content, choice) => content.trim()
          ? [{ label: String.fromCharCode(65 + choice), content, isCorrect: correctIndex === choice }]
          : []);
      } else if (type === "SHORT_ANSWER") {
        correctText = input.correctText?.trim() ?? "";
        if (!correctText) importWarnings.push("Câu " + position + " chưa có đáp án điền số.");
      } else if (type === "TRUE_FALSE_SET") {
        if (input.statements?.length !== 4) throw new HttpError(400, "Câu " + position + " cần 4 mệnh đề Đúng/Sai.");
        answerOptions = input.statements.map((statement, choice) => ({
          label: String.fromCharCode(65 + choice), content: statement.content, isCorrect: statement.isCorrect,
        }));
      }
      return {
        position, type, points: block.pointsPerQuestion,
        prompt: input.prompt, passage: input.passage || null,
        explanation: input.explanation || null, correctText, answerOptions,
      };
    });
    // The importer may retain incomplete source material as a DRAFT. Publication,
    // handled separately, always validates the entire official exam strictly.
    try {
      validateOfficialSpecialExam({
        track: metadata.track, variantId: metadata.variantId,
        durationMinutes: rule.durationMinutes, questions: prepared,
      });
    } catch (error) {
      importWarnings.push(error instanceof Error ? error.message : "Cấu trúc kỳ thi cần được kiểm tra.");
    }
    const subject = await prisma.subject.findUnique({ where: { id: metadata.subjectId }, select: { id: true, family: true } });
    if (!subject) throw new HttpError(404, "Không tìm thấy môn học được chọn.");
    if (subject.family !== "DGNL") throw new HttpError(400, "Đề ĐGNL phải được lưu vào môn thuộc nhóm ĐGNL.");

    const suffix = randomUUID().slice(0, 12).toLowerCase();
    const slugBase = metadata.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
    const code = "DGNL-" + metadata.track + "-" + suffix.toUpperCase();
    const exam = await prisma.$transaction(async (tx) => {
      const created = await tx.exam.create({
        data: {
          code, slug: (slugBase || "de-dgnl") + "-" + suffix,
          title: metadata.title,
          description: metadata.description || "Đề luyện tập " + rule.label + " · " + variant.label,
          family: "DGNL", specialExamTrack: metadata.track,
          type: "MOCK", contentMode: "EXAM",
          accessLevel: metadata.accessLevel,
          year: metadata.year, durationMinutes: rule.durationMinutes,
          educationLevel: null, grade: null, ownerId: null, isPublished: false,
          subjectId: subject.id,
          examStructure: {
            variantId: variant.id, variantLabel: variant.label,
            scoreMode: rule.scoreMode, questionCount: requiredCount,
            source: "native-special-import", structureVersion: "2026",
            importNeedsReview: importWarnings.length > 0,
          },
        }, select: { id: true, slug: true },
      });
      for (let offset = 0; offset < prepared.length; offset += 50) {
        const batch = prepared.slice(offset, offset + 50).map((item) => ({ ...item, id: randomUUID() }));
        await tx.question.createMany({
          data: batch.map((item) => ({
            id: item.id, examId: created.id, position: item.position,
            type: item.type, prompt: item.prompt, passage: item.passage,
            points: item.points, correctText: item.correctText, explanation: item.explanation,
          })),
        });
        const options = batch.flatMap((item) => item.answerOptions.map((option) => ({
          questionId: item.id, ...option,
        })));
        if (options.length) await tx.answerOption.createMany({ data: options });
      }
      return created;
    }, { maxWait: 10000, timeout: 120000 });
    return jsonOk({ exam, questionCount: prepared.length, track: metadata.track,
      variant: variant.label, isPublished: false, warnings: importWarnings }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
