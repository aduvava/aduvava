import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const family = searchParams.get("family");
    const subjects = await prisma.subject.findMany({
      where: family === "THPTQG" || family === "DGNL" ? { family } : undefined,
      include: { _count: { select: { exams: true } } },
      orderBy: { name: "asc" }
    });
    return jsonOk({ subjects });
  } catch (error) {
    return handleRouteError(error);
  }
}
