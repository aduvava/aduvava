import { prisma } from "@/lib/db";

export async function getPublicSubjects(family?: "THPTQG" | "DGNL") {
  try {
    return await prisma.subject.findMany({
      where: family ? { family } : undefined,
      include: { _count: { select: { exams: true } } },
      orderBy: { name: "asc" }
    });
  } catch (error) {
    console.error("Unable to load subjects from database", error);
    return [];
  }
}

export async function getPublishedBlogs(take = 6) {
  try {
    return await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take
    });
  } catch (error) {
    console.error("Unable to load blog posts from database", error);
    return [];
  }
}

export async function getPublicPlans() {
  try {
    return await prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } });
  } catch (error) {
    console.error("Unable to load plans from database", error);
    return [];
  }
}
