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
    const q = searchParams.get("q");
    const sort = searchParams.get("sort") ?? "newest";

    const where: Record<string, unknown> = { isPublished: true };
    if (family === "THPTQG" || family === "DGNL") where.family = family;
    if (subject) where.subject = { slug: subject };
    if (year) where.year = Number(year);
    if (type === "MOCK" || type === "PREDICTION" || type === "PRACTICE") where.type = type;
    if (access === "FREE" || access === "PRO") where.accessLevel = access;
    if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }];

    const exams = await prisma.exam.findMany({
      where,
      include: { subject: true, _count: { select: { questions: true, attempts: true } } },
      orderBy: sort === "year" ? { year: "desc" } : sort === "title" ? { title: "asc" } : { createdAt: "desc" }
    });

    return jsonOk({ exams });
  } catch (error) {
    return handleRouteError(error);
  }
}
