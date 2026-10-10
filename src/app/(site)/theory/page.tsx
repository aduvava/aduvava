import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/access";
import { Badge, Card } from "@/components/ui";

export default async function TheoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/theory");

  const active = await hasActiveSubscription(user.id);
  if (!active) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <Card>
          <Badge>PRO</Badge>
          <h1 className="mt-5 font-display text-4xl font-black text-ink">Thư viện lý thuyết cần VIP</h1>
          <p className="mt-3 text-ink/70">V1 dùng admin manual activation sau khi tạo payment mock.</p>
          <Link href="/vip" className="mt-6 inline-flex rounded-full bg-clay px-5 py-3 font-bold text-white">Nạp vip</Link>
        </Card>
      </div>
    );
  }

  const articles = await prisma.theoryArticle.findMany({ include: { subject: true }, orderBy: { updatedAt: "desc" } });

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <Badge>Thư viện</Badge>
      <h1 className="mt-5 font-display text-5xl font-black text-ink">Lý thuyết theo chuyên đề</h1>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {articles.map((article) => (
          <Card key={article.id}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss">{article.subject.name}</p>
            <h2 className="mt-4 font-display text-2xl font-black text-ink">{article.title}</h2>
            <p className="mt-3 text-sm leading-6 text-ink/65">{article.summary}</p>
            <p className="mt-5 text-sm leading-7 text-ink/75">{article.content}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
