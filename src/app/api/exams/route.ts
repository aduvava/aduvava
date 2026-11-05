import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const family = searchParams.get("family");
    const subject = searchParams.get("subject");
    const year = searchParams.get("year");
    const type = searchParams.get("type");
    const access = searchParams.get("access");
    const q = searchParams.get("q")?.slice(0, 160);
    const sort = searchParams.get("sort") ?? "newest";

    // The public exam catalog contains ADMIN/system exams only.
    // Personal uploads belong to /exams/my, regardless of their shareMode.
    // Direct share links continue to use the exam access rules.
    const where: Record<string, unknown> = { isPublished: true, ownerId: null };
    if (family === "THPTQG" || family === "DGNL") where.family = family;
    if (subject) where.subject = { slug: subject };
    if (year && /^\d{4}$/.test(year)) where.year = Number(year);
    if (type === "MOCK" || type === "PREDICTION" || type === "PRACTICE") where.type = type;
    if (access === "FREE" || access === "PRO") where.accessLevel = access;
    if (q) where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];

    const exams = await prisma.exam.findMany({
      where,
      // No shareToken, sharePasswordHash or answer-key data in list results.
      select: {
        id: true, code: true, slug: true, title: true, description: true,
        family: true, type: true, accessLevel: true, year: true,
        durationMinutes: true, educationLevel: true, subjectId: true,
        ownerId: true, shareMode: true, createdAt: true,
        subject: true, _count: { select: { questions: true, attempts: true } },
      },
      orderBy: sort === "year" ? { year: "desc" } : sort === "title" ? { title: "asc" } : { createdAt: "desc" },
      take: 200,
    });
    return jsonOk({ exams });
  } catch (error) {
    return handleRouteError(error);
  }
}
