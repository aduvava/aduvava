import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ExamRunner } from "@/components/exam-runner";

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/attempts/${id}`);

  const [attempt, account] = await Promise.all([
    prisma.attempt.findFirst({
    where: { id, userId: user.id },
    include: {
      answers: true,
      exam: { include: { subject: true, questions: { orderBy: { position: "asc" }, include: { answerOptions: { orderBy: { label: "asc" } } } } } }
    }
  }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { equippedSubmitEffectId: true },
    }).catch(() => null),
  ]);

  if (!attempt) notFound();
  if (attempt.status === "SUBMITTED") redirect(`/results/${attempt.id}`);

  const questions = attempt.exam.questions.map((question) => ({
    id: question.id,
    position: question.position,
    type: question.type,
    prompt: question.prompt,
    passage: question.passage,
    points: question.points,
    answerOptions: question.answerOptions.map((option) => ({ id: option.id, label: option.label, content: option.content }))
  }));
  const [submitEffectItem, helperPurchases] = await Promise.all([
    account?.equippedSubmitEffectId
      ? prisma.storeItem.findUnique({
          where: { id: account.equippedSubmitEffectId },
          select: { metadata: true },
        })
      : null,
    prisma.storePurchase.findMany({
      where: { userId: user.id, item: { category: "HELP", isConsumable: true, isActive: true } },
      include: { item: true },
    }),
  ]);
  const submitEffectMetadata = submitEffectItem?.metadata && typeof submitEffectItem.metadata === "object" && !Array.isArray(submitEffectItem.metadata)
    ? submitEffectItem.metadata as Record<string, unknown>
    : null;
  const helpersByItem = new Map<string, {
    id: string;
    name: string;
    kind: string;
    count: number;
    minutes?: number;
  }>();
  for (const purchase of helperPurchases) {
    const metadata = purchase.item.metadata && typeof purchase.item.metadata === "object" && !Array.isArray(purchase.item.metadata)
      ? purchase.item.metadata as Record<string, unknown>
      : {};
    const current = helpersByItem.get(purchase.itemId) ?? {
      id: purchase.itemId,
      name: purchase.item.name,
      kind: typeof metadata.kind === "string" ? metadata.kind : "",
      count: 0,
      minutes: typeof metadata.minutes === "number" ? metadata.minutes : undefined,
    };
    current.count += 1;
    helpersByItem.set(purchase.itemId, current);
  }

  return (
    <ExamRunner
      attemptId={attempt.id}
      examTitle={attempt.exam.title}
      examDescription={attempt.exam.description}
      subjectSlug={attempt.exam.subject.slug}
      subjectName={attempt.exam.subject.name}
      initialSeconds={Math.max(0, attempt.exam.durationMinutes * 60 - Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000))}
      questions={questions}
      initialAnswers={attempt.answers.map((answer) => ({ questionId: answer.questionId, value: answer.value }))}
      submitEffect={typeof submitEffectMetadata?.effect === "string" ? submitEffectMetadata.effect : null}
      helpers={Array.from(helpersByItem.values())}
    />
  );
}
