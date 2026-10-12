import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui";

async function getPost(slug: string) {
  try {
    return await prisma.blogPost.findFirst({ where: { slug, status: "PUBLISHED" } });
  } catch (error) {
    console.error("Unable to load blog post from database", error);
    return null;
  }
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <Badge>Blog</Badge>
      <h1 className="mt-6 font-display text-5xl font-black leading-tight text-ink">{post.title}</h1>
      <p className="mt-5 text-xl leading-8 text-ink/70">{post.excerpt}</p>
      <div className="prose-lite mt-10 rounded-[2rem] border border-ink/10 bg-white/80 p-8 shadow-lifted">
        {post.content.split("\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </article>
  );
}
