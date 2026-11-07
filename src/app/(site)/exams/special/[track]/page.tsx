import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenCheck, Clock3, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSpecialExamTrack, specialExamTracks } from "@/lib/special-exam-tracks";

export const dynamic = "force-dynamic";

export default async function SpecialExamTrackPage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const { track: slug } = await params;
  const selected = getSpecialExamTrack(slug);
  if (!selected || selected.slug !== slug) notFound();

  // Never show private user uploads, unpublished exams or answer-key content.
  const exams = await prisma.exam.findMany({
    where: { specialExamTrack: selected.id, ownerId: null, isPublished: true },
    select: {
      id: true, title: true, description: true, year: true,
      durationMinutes: true, accessLevel: true,
      subject: { select: { name: true } },
      _count: { select: { questions: true } },
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fffdf5] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard#mon-hoc" className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-600 hover:text-orange-600">
          <ArrowLeft className="h-4 w-4" /> Trở lại Ôn thi THPTQG
        </Link>
        <section className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-orange-600">
            <GraduationCap className="h-4 w-4" /> Kỳ thi riêng
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Ôn thi {selected.label}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Chọn đề thi đã được xuất bản trong kho Educhi. Nội dung được phân loại theo kỳ thi, không trộn lẫn với đề các môn THPTQG.
          </p>
          <nav aria-label="Chọn kỳ thi riêng" className="mt-6 flex flex-wrap gap-2">
            {specialExamTracks.map((track) => (
              <Link
                key={track.id}
                href={`/exams/special/${track.slug}`}
                aria-current={track.id === selected.id ? "page" : undefined}
                className={`rounded-full border px-4 py-2 text-sm font-extrabold transition ${track.id === selected.id
                  ? "border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600"}`}
              >
                {track.label}
              </Link>
            ))}
          </nav>
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black sm:text-2xl">Danh sách đề {selected.label}</h2>
          <span className="rounded-full border border-orange-100 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
            {exams.length} đề đã xuất bản
          </span>
        </div>
        {exams.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <article key={exam.id} className="flex h-full flex-col rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-600">{exam.year}</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{exam.subject.name}</span>
                  {exam.accessLevel === "PRO" ? <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">VIP</span> : null}
                </div>
                <h3 className="mt-4 text-lg font-black leading-7 text-slate-900">{exam.title}</h3>
                {exam.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{exam.description}</p> : null}
                <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{exam.durationMinutes} phút</span>
                  <span className="inline-flex items-center gap-1.5"><BookOpenCheck className="h-4 w-4" />{exam._count.questions} câu</span>
                </div>
                <Link href={`/exams/${exam.id}`} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black text-orange-600 hover:text-orange-700">
                  Xem và làm đề <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-orange-200 bg-white px-5 py-12 text-center">
            <BookOpenCheck className="mx-auto h-10 w-10 text-orange-400" />
            <p className="mt-4 text-lg font-black text-slate-800">Chưa có đề {selected.label} được xuất bản</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Các đề sẽ xuất hiện tại đây khi quản trị viên tải lên và chọn kỳ thi {selected.label}.</p>
          </div>
        )}
      </div>
    </main>
  );
}
