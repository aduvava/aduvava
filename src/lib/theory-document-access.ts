import { prisma } from "@/lib/db";
import { hasActiveSubscription } from "@/lib/access";
import { HttpError } from "@/lib/api";

export async function requireTheoryDocumentAccess(documentId: string, user: { id: string; role: string }) {
  if (user.role === "ADMIN") return;
  const vipLesson = await prisma.theoryLesson.findFirst({
    where: { content: `document:${documentId}`, accessLevel: "PRO", isPublished: true },
    select: { id: true },
  });
  if (vipLesson && !(await hasActiveSubscription(user.id))) {
    throw new HttpError(403, "Tài liệu này cần gói VIP.");
  }
}
