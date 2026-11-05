import { readPrivateDocument } from "@/lib/private-document-storage";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Yêu cầu đăng nhập", { status: 401 });
  const { lessonId } = await params;
  const lesson = await prisma.theoryLesson.findFirst({
    where: { id: lessonId, isPublished: true, chapter: { isPublished: true } },
    select: { fileStoredName: true, fileOriginalName: true, fileMimeType: true, accessLevel: true },
  });
  if (!lesson?.fileStoredName || !lesson.fileMimeType) return new Response("Không tìm thấy tài liệu", { status: 404 });
  if (lesson.accessLevel === "PRO" && !(await hasActiveSubscription(user.id))) {
    return new Response("Yêu cầu VIP", { status: 403 });
  }
  try {
    const buffer = readPrivateDocument(lesson.fileStoredName);
    const isPdf = lesson.fileMimeType === "application/pdf";
    const filename = isPdf ? "bai-ly-thuyet.pdf" : "bai-ly-thuyet.docx";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": lesson.fileMimeType,
        "Content-Disposition": `${isPdf ? "inline" : "attachment"}; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
        // Use browser-native PDF rendering; force downloads for DOCX.
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Không đọc được tài liệu", { status: 404 });
  }
}
