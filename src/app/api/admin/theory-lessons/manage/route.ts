import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { HttpError, handleRouteError, jsonOk, readJson, requireAdmin } from "@/lib/api";
import { theoryFileIsSupported, theoryLessonFormSchema, theorySlug } from "@/lib/theory-admin";
import { validateDocumentBuffer, InvalidDocumentError, MAX_FILE_SIZE } from "@/lib/document-file-validation";
import { scanDocumentBuffer } from "@/lib/document-malware-scan";
import { documentStorageDirectory, documentStoredPath } from "@/lib/private-document-storage";

export const runtime = "nodejs";

const MAX_MULTIPART_SIZE = MAX_FILE_SIZE + 512 * 1024;

async function removeSavedFile(storedName: string | null | undefined) {
  if (!storedName) return;
  try { await unlink(documentStoredPath(storedName)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Theory file cleanup failed", error);
    }
  }
}

export async function POST(request: Request) {
  let newStoredName: string | null = null;
  try {
    await requireAdmin();
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_MULTIPART_SIZE) throw new HttpError(413, "Tệp tải lên vượt quá 15 MB.");
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      throw new HttpError(415, "Yêu cầu phải là biểu mẫu có tệp.");
    }
    const form = await request.formData();
    const payload = theoryLessonFormSchema.parse(Object.fromEntries(
      ["chapterId", "title", "summary", "content", "position", "accessLevel", "isPublished", "removeFile", "lessonId"]
        .map((key) => [key, form.get(key) ?? ""]),
    ));
    const inputFile = form.get("file");
    const file = inputFile instanceof File && inputFile.size > 0 ? inputFile : null;
    if (file && payload.removeFile) throw new HttpError(400, "Chỉ chọn tải file mới hoặc xóa file cũ.");
    if (file && (!theoryFileIsSupported(file.name) || file.size > MAX_FILE_SIZE)) {
      throw new HttpError(400, "Chỉ hỗ trợ PDF và DOCX tối đa 15 MB.");
    }

    const [chapter, current] = await Promise.all([
      prisma.theoryChapter.findUnique({ where: { id: payload.chapterId }, select: { id: true } }),
      payload.lessonId
        ? prisma.theoryLesson.findUnique({ where: { id: payload.lessonId }, select: { id: true, fileStoredName: true } })
        : Promise.resolve(null),
    ]);
    if (!chapter) throw new HttpError(404, "Không tìm thấy chương đã chọn.");
    if (payload.lessonId && !current) throw new HttpError(404, "Không tìm thấy bài cần sửa.");
    const willRetainFile = current?.fileStoredName && !payload.removeFile;
    if (!payload.content && !file && !willRetainFile) {
      throw new HttpError(400, "Hãy nhập nội dung lý thuyết hoặc tải lên PDF/DOCX.");
    }

    let fileMetadata: { fileStoredName: string; fileOriginalName: string; fileMimeType: string; fileSize: number } | null = null;
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      let info: { extension: string; mimeType: string; fileSize: number };
      try {
        info = validateDocumentBuffer(buffer, file.name, file.type);
      } catch (error) {
        if (error instanceof InvalidDocumentError) throw new HttpError(400, error.message);
        throw error;
      }
      if (info.extension !== ".pdf" && info.extension !== ".docx") {
        throw new HttpError(400, "Chỉ hỗ trợ tệp PDF hoặc DOCX.");
      }
      // Same fail-closed malware scanner and private volume as document uploads.
      await scanDocumentBuffer(buffer);
      newStoredName = `theory_${randomUUID().replace(/-/g, "")}${info.extension}`;
      await mkdir(documentStorageDirectory(), { recursive: true });
      await writeFile(documentStoredPath(newStoredName), buffer, { flag: "wx", mode: 0o600 });
      fileMetadata = {
        fileStoredName: newStoredName,
        fileOriginalName: file.name.slice(0, 200),
        fileMimeType: info.mimeType,
        fileSize: info.fileSize,
      };
    }

    const shared = {
      chapterId: payload.chapterId,
      title: payload.title,
      summary: payload.summary || null,
      content: payload.content,
      position: payload.position,
      accessLevel: payload.accessLevel,
      isPublished: payload.isPublished,
    };
    const resetFile = payload.removeFile
      ? { fileStoredName: null, fileOriginalName: null, fileMimeType: null, fileSize: null }
      : {};
    const item = current
      ? await prisma.theoryLesson.update({
          where: { id: current.id },
          data: { ...shared, ...resetFile, ...(fileMetadata ?? {}) },
        })
      : await prisma.theoryLesson.create({
          data: {
            ...shared,
            slug: `${theorySlug(payload.title)}-${randomUUID().slice(0, 8)}`,
            ...(fileMetadata ?? {}),
          },
        });
    newStoredName = null;
    if (current?.fileStoredName && (payload.removeFile || fileMetadata)) {
      await removeSavedFile(current.fileStoredName);
    }
    return jsonOk({ item }, current ? 200 : 201);
  } catch (error) {
    await removeSavedFile(newStoredName);
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const input = await readJson<unknown>(request);
    if (!input || typeof input !== "object" || !("lessonId" in input) ||
      typeof input.lessonId !== "string" || !input.lessonId.trim()) {
      throw new HttpError(400, "Thiếu mã bài lý thuyết.");
    }
    const old = await prisma.theoryLesson.delete({
      where: { id: input.lessonId },
      select: { fileStoredName: true, id: true },
    });
    await removeSavedFile(old.fileStoredName);
    return jsonOk({ deleted: old.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
