import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SubjectLearningDetail } from "@/components/subject-learning-detail";

type SubjectPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ level?: string; grade?: string }>;
};

const levelLabels: Record<string, string> = {
  secondary: "Trung học cơ sở",
  "high-school": "Trung học phổ thông",
  "grade-10": "Ôn thi vào 10",
  "national-exam": "Ôn thi THPTQG",
};

const educationLevelByQuery: Record<string, "THCS" | "THPT" | "EXAM_10" | "THPTQG"> = {
  secondary: "THCS",
  "high-school": "THPT",
  "grade-10": "EXAM_10",
  "national-exam": "THPTQG",
};

export default async function SubjectPage({ params, searchParams }: SubjectPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const requestedEducationLevel = query.level ? educationLevelByQuery[query.level] : undefined;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [databaseSubject, allSubjects] = await Promise.all([
    prisma.subject.findUnique({
      where: { slug },
      include: {
        topics: {
          include: { _count: { select: { questions: true } } },
          orderBy: { name: "asc" },
        },
        theoryChapters: {
          where: {
            isPublished: true,
            AND: [
              requestedEducationLevel
                ? { OR: [{ educationLevel: requestedEducationLevel }, { educationLevel: null }] }
                : {},
              query.grade ? { OR: [{ grade: query.grade }, { grade: null }] } : {},
            ],
          },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            },
          },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
        exams: {
          where: {
            isPublished: true,
            ...(requestedEducationLevel === "THPTQG"
              ? { educationLevel: "THPTQG" as const }
              : requestedEducationLevel
                ? { OR: [{ educationLevel: requestedEducationLevel }, { educationLevel: null }] }
                : {}),
          },
          include: {
            _count: { select: { questions: true, attempts: true } },
            attempts: {
              where: { status: "SUBMITTED", submittedAt: { gte: weekAgo } },
              select: { id: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
        },
      },
    }),
    prisma.subject.findMany({
      include: { _count: { select: { exams: true, theoryChapters: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!databaseSubject) notFound();

  const theoryChapters = databaseSubject.theoryChapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    description: chapter.description,
    lessons: chapter.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      href: `/theory/${lesson.id}`,
    })),
  }));
  const theoryLessonCount = databaseSubject.theoryChapters.reduce(
    (total, chapter) => total + chapter.lessons.length,
    0,
  );
  const units = databaseSubject.topics.length
    ? [{ title: "Chuyên đề", lessons: databaseSubject.topics.map((topic) => topic.name) }]
    : [];
  const subjectItems = allSubjects.map((item) => ({
    slug: item.slug,
    name: item.name,
    shortName: item.name,
    accent: "from-orange-500 to-amber-400",
    icon: item.icon,
    lessonCount: item._count.theoryChapters,
    examCount: item._count.exams,
  }));
  const hotExams = databaseSubject.exams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    href: `/exams/${exam.id}`,
    durationMinutes: exam.durationMinutes,
    questionCount: exam._count.questions,
    attemptCount: exam._count.attempts,
    weeklyParticipants: exam.attempts.length,
  }));

  const context = new URLSearchParams();
  if (query.level) context.set("level", query.level);
  if (query.grade) context.set("grade", query.grade);

  return (
    <SubjectLearningDetail
      subject={{
        slug: databaseSubject.slug,
        name: databaseSubject.name,
        shortName: databaseSubject.name,
        description: databaseSubject.description,
        accent: "from-orange-500 to-amber-400",
        icon: databaseSubject.icon,
        lessonCount: theoryLessonCount,
        examCount: databaseSubject.exams.length,
        units,
        theoryChapters,
      }}
      subjects={subjectItems}
      hotExams={hotExams}
      levelLabel={query.level ? levelLabels[query.level] ?? query.level : undefined}
      gradeLabel={query.grade}
      contextQuery={context.size ? `?${context.toString()}` : ""}
    />
  );
}
