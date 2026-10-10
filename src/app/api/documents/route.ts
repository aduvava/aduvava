import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { documentCatalog, documentTypes } from "@/lib/document-catalog";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const allowedExtensions = new Set([".pdf", ".docx", ".pptx"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const metadataSchema = z.object({
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(10).max(1200),
  level: z.enum(["THCS", "THPT", "EXAM_10", "THPTQG"]),
  grade: z.string().trim().min(1).max(30),
  subject: z.string().trim().min(1).max(80),
  type: z.enum(["MOCK_EXAM", "THEORY_SUMMARY", "FORMULA_HANDBOOK", "FINAL_REVIEW"]),
});

function validateCatalog(payload: z.infer<typeof metadataSchema>) {
  const level = documentCatalog.find((item) => item.id === payload.level);
  if (!level) throw new HttpError(400, "Cấp học không hợp lệ.");
  if (!(level.grades as readonly string[]).includes(payload.grade)) throw new HttpError(400, "Khối lớp không hợp lệ.");
  if (!(level.subjects as readonly string[]).includes(payload.subject)) throw new HttpError(400, "Môn học không hợp lệ.");
  if (!documentTypes.some((item) => item.id === payload.type)) throw new HttpError(400, "Loại tài liệu không hợp lệ.");
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const level = searchParams.get("level");
    const grade = searchParams.get("grade");
    const subject = searchParams.get("subject");
    const type = searchParams.get("type");
    const mine = searchParams.get("mine") === "1";

    const where: Record<string, unknown> = mine ? { uploaderId: user.id } : { status: "APPROVED" };
    if (level) where.level = level;
    if (grade) where.grade = grade;
    if (subject) where.subject = subject;
    if (type) where.type = type;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploader: { select: { id: true, name: true } },
        ratings: { select: { userId: true, rating: true } },
        _count: { select: { ratings: true, reports: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return jsonOk({
      documents: documents.map((document) => {
        const ratingTotal = document.ratings.reduce((sum, rating) => sum + rating.rating, 0);
        return {
          id: document.id,
          title: document.title,
          description: document.description,
          level: document.level,
          grade: document.grade,
          subject: document.subject,
          type: document.type,
          originalName: document.originalName,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          status: document.status,
          rejectionReason: document.rejectionReason,
          downloads: document.downloads,
          uploader: document.uploader,
          ratingCount: document._count.ratings,
          averageRating: document._count.ratings ? ratingTotal / document._count.ratings : 0,
          myRating: document.ratings.find((rating) => rating.userId === user.id)?.rating ?? 0,
          createdAt: document.createdAt,
        };
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const payload = metadataSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      level: formData.get("level"),
      grade: formData.get("grade"),
      subject: formData.get("subject"),
      type: formData.get("type"),
    });
    validateCatalog(payload);

    const file = formData.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Vui lòng đính kèm tài liệu.");
    if (!file.size || file.size > MAX_FILE_SIZE) throw new HttpError(400, "Tệp phải nhỏ hơn hoặc bằng 15MB.");

    const extension = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.has(extension) || (file.type && !allowedMimeTypes.has(file.type))) {
      throw new HttpError(400, "Chỉ hỗ trợ PDF, DOCX và PPTX.");
    }
    const mimeType = file.type || (
      extension === ".pdf"
        ? "application/pdf"
        : extension === ".docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );

    const storedName = `${randomUUID()}${extension}`;
    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "documents");
    await mkdir(uploadDirectory, { recursive: true });
    const storedPath = path.join(uploadDirectory, storedName);
    await writeFile(storedPath, Buffer.from(await file.arrayBuffer()));

    let document;
    try {
      document = await prisma.document.create({
        data: {
          ...payload,
          originalName: file.name,
          storedName,
          mimeType,
          fileSize: file.size,
          uploaderId: user.id,
        },
        select: { id: true, status: true },
      });
    } catch (error) {
      await unlink(storedPath).catch(() => undefined);
      throw error;
    }

    return jsonOk({ document, message: "Tài liệu đã được gửi và đang chờ Admin duyệt." }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
