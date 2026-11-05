import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SubjectLearningDetail } from "@/components/subject-learning-detail";
import { getDashboardSubjects } from "@/lib/dashboard-subjects";

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
  // Dashboard uses "Môn thi" for both national-exam selectors. Resolve this
  // to the corresponding chapter grade so students see uploaded lessons.
  const requestedGrade = query.grade === "Môn thi" && requestedEducationLevel === "EXAM_10"
    ? "Ôn thi vào 10"
    : query.grade === "Môn thi" && requestedEducationLevel === "THPTQG"
      ? "Ôn thi THPTQG"
      : query.grade;
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
              requestedGrade ? { OR: [{ grade: requestedGrade }, { grade: null }] } : {},
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
  const visibleSubjects = requestedEducationLevel === "THCS"
    ? getDashboardSubjects(allSubjects, "secondary")
    : allSubjects;
  const displaySubjectName = visibleSubjects.find((item) => item.slug === databaseSubject.slug)?.name
    ?? databaseSubject.name;
  const subjectItems = visibleSubjects.map((item) => ({
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
        name: displaySubjectName,
        shortName: displaySubjectName,
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
