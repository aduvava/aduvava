import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui";

export function SubjectCard({ subject }: { subject: { slug: string; name: string; description: string; color?: string | null; _count?: { exams: number } } }) {
  return (
    <Link href={`/subjects/${subject.slug}`}>
      <Card className="group h-full overflow-hidden transition hover:-translate-y-1">
        <div className="mb-8 h-2 w-24 rounded-full" style={{ backgroundColor: subject.color ?? "#1f6f5b" }} />
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-3xl font-black text-ink">{subject.name}</h3>
          <span className="rounded-full bg-sand p-3 text-ink transition group-hover:bg-clay group-hover:text-white">
            <ArrowUpRight size={18} />
          </span>
        </div>
        <p className="mt-4 text-sm leading-6 text-ink/65">{subject.description}</p>
        <p className="mt-8 text-sm font-bold text-moss">{subject._count?.exams ?? 0} đề đang mở</p>
      </Card>
    </Link>
  );
}
