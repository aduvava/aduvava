import { readFile } from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, requireUser } from "@/lib/api";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function htmlPage(title: string, body: string) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#334155;line-height:1.7;background:#fff}img{max-width:100%}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #ddd;padding:8px}</style></head><body>${body}</body></html>`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) throw new HttpError(404, "Không tìm thấy tài liệu.");
    if (document.status !== "APPROVED" && document.uploaderId !== user.id && user.role !== "ADMIN") {
      throw new HttpError(403, "Tài liệu chưa được công khai.");
    }

    const filePath = path.join(process.cwd(), "public", "uploads", "documents", document.storedName);
    const file = await readFile(filePath);

    if (document.mimeType === "application/pdf") {
      return new Response(new Uint8Array(file), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline", "Cache-Control": "private, no-store" },
      });
    }

    if (document.mimeType.includes("wordprocessingml")) {
      const result = await mammoth.convertToHtml({ buffer: file });
      return new Response(htmlPage(document.title, result.value), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    return new Response(
      htmlPage(
        document.title,
        `<div style="max-width:720px;margin:80px auto;text-align:center"><h1>${escapeHtml(document.title)}</h1><p>Trình duyệt chưa hỗ trợ xem trực tiếp PowerPoint. Bạn có thể tải tệp <strong>${escapeHtml(document.originalName)}</strong> bằng nút tải xuống.</p></div>`,
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
