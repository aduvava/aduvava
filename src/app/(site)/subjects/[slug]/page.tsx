import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SubjectLearningDetail } from "@/components/subject-learning-detail";
import {
  getSubjectLearningItem,
  getSubjectsForLearningLevel,
  isLearningLevel,
  type SubjectLearningItem,
} from "@/data/subject-learning-catalog";

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

function createFallbackSubject(
  slug: string,
  record: { name: string; description: string; color: string; icon: string; _count: { exams: number } },
): SubjectLearningItem {
  return {
    slug,
    name: record.name,
    shortName: record.name,
    description: record.description,
    color: record.color,
    accent: "from-orange-500 to-amber-400",
    icon: record.icon,
    lessonCount: 18,
    examCount: record._count.exams,
    aliases: [record.name],
    units: [
      {
        title: "Kiến thức nền tảng",
        lessons: ["Hệ thống khái niệm trọng tâm", "Phương pháp giải dạng bài cơ bản", "Luyện tập tổng hợp"],
      },
      {
        title: "Luyện đề nâng cao",
        lessons: ["Nhận diện dạng câu hỏi", "Chiến thuật phân bổ thời gian", "Chữa lỗi và củng cố điểm yếu"],
      },
    ],
    sampleQuestion: {
      prompt: "Chọn phương án đúng.",
      answers: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
      correctIndex: 0,
      explanation: "Xem phần kiến thức trọng tâm để đối chiếu.",
    },
  };
}

export default async function SubjectPage({ params, searchParams }: SubjectPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const visibleCatalog = getSubjectsForLearningLevel(query.level);
  const allowedSlugs = new Set(visibleCatalog.map((item) => item.slug));

  if (isLearningLevel(query.level) && !allowedSlugs.has(slug)) {
    const replacement = visibleCatalog[0];
    const redirectQuery = new URLSearchParams({ level: query.level });
    if (query.grade) redirectQuery.set("grade", query.grade);
    redirect(`/subjects/${replacement.slug}?${redirectQuery.toString()}`);
  }

  const catalogSubject = getSubjectLearningItem(slug);
  const requestedEducationLevel = query.level ? educationLevelByQuery[query.level] : undefined;
  const databaseSubject = await prisma.subject.findUnique({
    where: { slug },
    include: {
      _count: { select: { exams: true } },
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
        include: { _count: { select: { questions: true, attempts: true } } },
        orderBy: [{ educationLevel: "desc" }, { createdAt: "desc" }],
        take: 12,
      },
    },
  });

  if (!catalogSubject && !databaseSubject) notFound();

  const subject = catalogSubject ??
    createFallbackSubject(slug, {
      name: databaseSubject!.name,
      description: databaseSubject!.description,
      color: databaseSubject!.color,
      icon: databaseSubject!.icon,
      _count: databaseSubject!._count,
    });

  const databaseCounts = await prisma.subject.findMany({
    where: { slug: { in: visibleCatalog.map((item) => item.slug) } },
    select: { slug: true, _count: { select: { exams: true } } },
  });
  const countBySlug = new Map(databaseCounts.map((item) => [item.slug, item._count.exams]));
  const subjectItems = visibleCatalog.map((item) => ({
    slug: item.slug,
    name: item.name,
    shortName: item.shortName,
    accent: item.accent,
    icon: item.icon,
    lessonCount: item.lessonCount,
    examCount: Math.max(item.examCount, countBySlug.get(item.slug) ?? 0),
  }));

  if (!subjectItems.some((item) => item.slug === subject.slug)) {
    subjectItems.unshift({
      slug: subject.slug,
      name: subject.name,
      shortName: subject.shortName,
      accent: subject.accent,
      icon: subject.icon,
      lessonCount: subject.lessonCount,
      examCount: databaseSubject?._count.exams ?? subject.examCount,
    });
  }

  const realExams = databaseSubject?.exams ?? [];
  const fallbackExam = realExams[0];
  const availableExamCount = Math.max(3, realExams.length);
  const hotExams = Array.from({ length: availableExamCount }, (_, index) => {
    const exam = realExams[index] ?? fallbackExam;
    if (exam) {
      return {
        id: `${exam.id}-${index}`,
        title: exam.title,
        href: `/exams/${exam.id}`,
        durationMinutes: exam.durationMinutes,
        questionCount: Math.max(exam._count.questions, 10 + index * 10),
        attemptCount: exam._count.attempts,
        weeklyParticipants: 120 - index * 30 + exam._count.attempts,
      };
    }
    return {
      id: `${subject.slug}-fallback-${index}`,
      title: `${["Luyện nhanh", "Đề thi thử", "Ôn tập trọng tâm"][index]} ${subject.name}`,
      href: "/thi-thptqg",
      durationMinutes: [20, 45, 30][index],
      questionCount: [20, 30, 25][index],
      attemptCount: 12 + index,
      weeklyParticipants: 120 - index * 30,
    };
  });

  const context = new URLSearchParams();
  if (query.level) context.set("level", query.level);
  if (query.grade) context.set("grade", query.grade);
  const contextQuery = context.size ? `?${context.toString()}` : "";
  const databaseTheoryChapters = databaseSubject?.theoryChapters ?? [];
  const theoryChapters = databaseTheoryChapters.length
    ? databaseTheoryChapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        lessons: chapter.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          summary: lesson.summary,
          href: `/theory/${lesson.id}`,
        })),
      }))
    : subject.units.map((unit, unitIndex) => ({
        id: `${subject.slug}-fallback-chapter-${unitIndex}`,
        title: unit.title,
        description: null,
        lessons: unit.lessons.map((lesson, lessonIndex) => {
          const params = new URLSearchParams({
            subject: subject.name,
            chapter: unit.title,
            title: lesson,
          });
          return {
            id: `${subject.slug}-fallback-lesson-${unitIndex}-${lessonIndex}`,
            title: lesson,
            summary: "Bài lý thuyết mẫu, admin có thể thay bằng nội dung trong database.",
            href: `/theory/fallback-${subject.slug}-${unitIndex}-${lessonIndex}?${params.toString()}`,
          };
        }),
      }));

  return (
    <SubjectLearningDetail
      subject={{
        slug: subject.slug,
        name: subject.name,
        shortName: subject.shortName,
        description: subject.description,
        accent: subject.accent,
        icon: subject.icon,
        lessonCount: subject.lessonCount,
        examCount: Math.max(subject.examCount, databaseSubject?._count.exams ?? 0),
        units: subject.units,
        theoryChapters,
      }}
      subjects={subjectItems}
      hotExams={hotExams}
      levelLabel={query.level ? levelLabels[query.level] ?? query.level : undefined}
      gradeLabel={query.grade}
      contextQuery={contextQuery}
    />
  );
}
