import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Lock } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/access";

type TheoryLessonPageProps = {
  params: Promise<{ lessonId: string }>;
};

function renderContent(content: string) {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => (
      <p key={index} className="text-lg leading-9 text-slate-700">
        {block}
      </p>
    ));
}

export default async function TheoryLessonPage({ params }: TheoryLessonPageProps) {
  const { lessonId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/theory/${lessonId}`);

  const lesson = await prisma.theoryLesson.findFirst({
    where: { id: lessonId, isPublished: true },
    include: {
      chapter: {
        include: {
          subject: true,
        },
      },
    },
  });

  if (!lesson) notFound();

  if (lesson.accessLevel === "PRO") {
    const active = await hasActiveSubscription(user.id);
    if (!active) redirect("/vip");
  }

  return (
    <main className="min-h-screen bg-[#fffdf1] px-4 py-10 text-slate-900 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href={`/subjects/${lesson.chapter.subject.slug}`} className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-orange-600">
          <ArrowLeft className="h-5 w-5" /> Quay lại môn học
        </Link>
        <article className="mt-8 rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm md:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-orange-600">
              <BookOpen className="h-4 w-4" /> Lý thuyết
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> {lesson.chapter.subject.name}
            </span>
            {lesson.accessLevel === "PRO" ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-600">
                <Lock className="h-4 w-4" /> PRO
              </span>
            ) : null}
          </div>
          <h1 className="mt-5 text-3xl font-black leading-tight md:text-5xl">{lesson.title}</h1>
          <p className="mt-3 text-sm font-bold text-slate-400">Chương: {lesson.chapter.title}</p>
          {lesson.summary ? <p className="mt-6 rounded-3xl bg-orange-50 p-5 text-lg font-semibold leading-8 text-orange-700">{lesson.summary}</p> : null}
          <div className="mt-8 space-y-5">{renderContent(lesson.content)}</div>
        </article>
      </div>
    </main>
  );
}
