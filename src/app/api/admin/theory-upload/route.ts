import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireAdmin } from "@/lib/api";
import { validateDocumentBuffer, MAX_FILE_SIZE } from "@/lib/document-file-validation";
import { scanDocumentBuffer } from "@/lib/document-malware-scan";
import { documentStorageDirectory, documentStoredPath } from "@/lib/private-document-storage";

export const runtime = "nodejs";
const schema = z.object({ subjectId: z.string().min(1), grade: z.enum(["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9", "Lớp 10", "Lớp 11", "Lớp 12", "Ôn thi vào 10", "Ôn thi THPTQG"]), title: z.string().trim().min(3).max(180), description: z.string().trim().max(1200), accessLevel: z.enum(["FREE", "PRO"]) });

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const form = await request.formData();
    const input = schema.parse(Object.fromEntries(["subjectId", "grade", "title", "description", "accessLevel"].map((key) => [key, form.get(key)])));
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_FILE_SIZE) throw new HttpError(400, "Chọn file PDF hoặc Word (.docx), tối đa 15 MB.");
    const subject = await prisma.subject.findUnique({ where: { id: input.subjectId } });
    if (!subject) throw new HttpError(404, "Không tìm thấy môn học.");
    const level = input.grade === "Ôn thi THPTQG" ? "THPTQG" : input.grade === "Ôn thi vào 10" ? "EXAM_10" : Number(input.grade.slice(4)) <= 9 ? "THCS" : "THPT";
    const buffer = Buffer.from(await file.arrayBuffer());
    const verified = validateDocumentBuffer(buffer, file.name, file.type);
    if (![".pdf", ".docx"].includes(verified.extension)) throw new HttpError(400, "Chỉ hỗ trợ PDF hoặc Word (.docx).");
    await scanDocumentBuffer(buffer);
    const storedName = `${randomUUID()}${verified.extension}`;
    await mkdir(documentStorageDirectory(), { recursive: true });
    const storedPath = documentStoredPath(storedName);
    await writeFile(storedPath, buffer, { flag: "wx" });
    try {
      const result = await prisma.$transaction(async (tx) => {
        const document = await tx.document.create({ data: { title: input.title, description: input.description || `Lý thuyết ${input.grade} · ${subject.name}`, level, grade: input.grade === "Ôn thi vào 10" || input.grade === "Ôn thi THPTQG" ? "Môn thi" : input.grade, subject: subject.name, type: "THEORY_SUMMARY", originalName: file.name, storedName, mimeType: verified.mimeType, fileSize: file.size, uploaderId: admin.id, status: "APPROVED", approvedAt: new Date() } });
        const slug = `ly-thuyet-${randomUUID().slice(0, 12)}`;
        const chapter = await tx.theoryChapter.create({ data: { subjectId: subject.id, educationLevel: level, grade: input.grade === "Ôn thi vào 10" || input.grade === "Ôn thi THPTQG" ? "Môn thi" : input.grade, slug, title: input.title, description: input.description || null, isPublished: true } });
        const lesson = await tx.theoryLesson.create({ data: { chapterId: chapter.id, slug, title: input.title, summary: input.description || null, content: `document:${document.id}`, accessLevel: input.accessLevel, isPublished: true } });
        return { document, chapter, lesson };
      });
      return jsonOk({ id: result.lesson.id, documentId: result.document.id }, 201);
    } catch (error) { await unlink(storedPath).catch(() => undefined); throw error; }
  } catch (error) { return handleRouteError(error); }
}
