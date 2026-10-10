import Link from "next/link";
import { Clock, Lock, Unlock } from "lucide-react";
import { Badge, Card } from "@/components/ui";

export function ExamCard({ exam }: { exam: { id: string; title: string; description: string; year: number; durationMinutes: number; accessLevel: "FREE" | "PRO"; type: string; subject?: { name: string } | null; _count?: { questions: number; attempts?: number } } }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={exam.accessLevel === "PRO" ? "bg-ink text-sand" : undefined}>{exam.accessLevel}</Badge>
        <span className="rounded-full bg-sand px-3 py-1 text-xs font-bold text-ink/70">{exam.type}</span>
        <span className="rounded-full bg-sand px-3 py-1 text-xs font-bold text-ink/70">{exam.year}</span>
      </div>
      <h3 className="mt-5 font-display text-2xl font-black leading-tight text-ink">{exam.title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-ink/65">{exam.description}</p>
      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-semibold text-ink/70">
        <span className="inline-flex items-center gap-2"><Clock size={16} /> {exam.durationMinutes} phút</span>
        <span>{exam._count?.questions ?? 0} câu</span>
        <span className="inline-flex items-center gap-2">{exam.accessLevel === "PRO" ? <Lock size={16} /> : <Unlock size={16} />} {exam.subject?.name}</span>
      </div>
      <Link href={`/exams/${exam.id}`} className="mt-6 inline-flex justify-center rounded-full bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-moss">
        Xem đề
      </Link>
    </Card>
  );
}
