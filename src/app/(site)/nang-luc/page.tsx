import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, BookOpenCheck, Target } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type TopicStats = {
  key: string;
  name: string;
  subject: string;
  subjectSlug: string;
  earned: number;
  maximum: number;
  count: number;
};

export default async function LearningStrengthPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/nang-luc");

  // Limit scanning for predictable query cost on shared VPS. Only graded answers count.
  const answers = await prisma.attemptAnswer.findMany({
    where: { attempt: { userId: user.id, status: "SUBMITTED" }, isCorrect: { not: null } },
    select: {
      score: true,
      question: {
        select: {
          points: true,
          topic: { select: { id: true, name: true } },
          exam: { select: { subject: { select: { name: true, slug: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 2500,
  });

  const topics = new Map<string, TopicStats>();
  let uncategorized = 0;
  for (const answer of answers) {
    const topic = answer.question.topic;
    if (!topic) { uncategorized += 1; continue; }
    const subject = answer.question.exam.subject;
    const key = subject.slug + ":" + topic.id;
    const entry = topics.get(key) ?? {
      key, name: topic.name, subject: subject.name, subjectSlug: subject.slug,
      earned: 0, maximum: 0, count: 0,
    };
    entry.earned += answer.score;
    entry.maximum += answer.question.points;
    entry.count += 1;
    topics.set(key, entry);
  }

  const bySubject = new Map<string, TopicStats[]>();
  for (const topic of topics.values()) {
    const key = topic.subjectSlug;
    const items = bySubject.get(key) ?? [];
    items.push(topic);
    bySubject.set(key, items);
  }
  const grouped = Array.from(bySubject.entries()).map(([slug, items]) => ({
    slug,
    name: items[0]?.subject ?? slug,
    topics: items.sort((a, b) => (a.maximum ? a.earned / a.maximum : 0) - (b.maximum ? b.earned / b.maximum : 0)),
  })).sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <main className="min-h-screen bg-orange-50/40 pb-24">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="text-sm font-bold text-orange-600 hover:underline">← Trở về trang chủ</Link>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-black text-slate-900"><BarChart3 className="h-8 w-8 text-orange-500" /> Bản đồ năng lực</h1>
            <p className="mt-2 text-sm text-slate-600">Tỷ lệ điểm đạt được theo chuyên đề từ những bài đã nộp; cập nhật sau mỗi bài thi.</p>
          </div>
          <Link href="/so-loi-sai" className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm font-bold text-orange-600 hover:bg-orange-50">
            <BookOpenCheck className="h-4 w-4" /> Ôn lại lỗi sai
          </Link>
        </div>
        {uncategorized > 0 ? (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {uncategorized} lượt trả lời chưa có nhãn chuyên đề nên không đưa vào biểu đồ. Admin cần gắn chuyên đề cho các câu hỏi này.
          </p>
        ) : null}
        {!grouped.length ? (
          <div className="mt-6 rounded-3xl border border-orange-100 bg-white p-8 text-center">
            <Target className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-xl font-black">Chưa có đủ dữ liệu chuyên đề</h2>
            <p className="mt-2 text-sm text-slate-500">Hãy hoàn thành đề đã được phân loại chuyên đề để xem điểm mạnh và phần cần ôn.</p>
            <Link href="/exams" className="mt-5 inline-block rounded-xl bg-orange-500 px-5 py-3 font-bold text-white">Tìm đề luyện tập</Link>
          </div>
        ) : null}
        <div className="mt-6 space-y-6">
          {grouped.map((group) => (
            <section key={group.slug} className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-900">{group.name}</h2>
                <Link href={"/subjects/" + group.slug} className="text-sm font-bold text-orange-600 hover:underline">Luyện thêm môn này →</Link>
              </div>
              <div className="mt-5 space-y-5">
                {group.topics.map((topic) => {
                  const percent = topic.maximum ? Math.round(topic.earned / topic.maximum * 100) : 0;
                  const enough = topic.count >= 5;
                  return (
                    <div key={topic.key}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <strong className="text-slate-800">{topic.name}</strong>
                        <span className="font-bold text-slate-600">
                          {enough ? percent + "% · " : "Chưa đủ dữ liệu · "}{topic.count} lượt trả lời
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div className={"h-full rounded-full " + (!enough ? "bg-slate-400" : percent < 50 ? "bg-red-500" : percent < 75 ? "bg-amber-400" : "bg-emerald-500")} style={{ width: percent + "%" }} />
                      </div>
                      {enough && percent < 60 ? <p className="mt-1 text-xs font-semibold text-amber-700">Nên ưu tiên ôn tập chuyên đề này.</p> : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-5 text-xs leading-6 text-slate-500">
          Biểu đồ dựa trên tối đa 2.500 lượt trả lời được chấm gần đây, có thể gồm nhiều lần làm cùng một câu.
          Kết quả là chỉ báo học tập, không phải đánh giá năng lực tuyệt đối.
        </p>
      </div>
    </main>
  );
}
