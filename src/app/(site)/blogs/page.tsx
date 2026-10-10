import Link from "next/link";
import { getPublishedBlogs } from "@/lib/public-data";
import { Card, SectionHeader } from "@/components/ui";

export default async function BlogsPage() {
  const blogs = await getPublishedBlogs(20);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <SectionHeader eyebrow="Blog" title="Chiến lược học và chữa lỗi" description="CMS blog public, phục vụ SEO và nurturing học sinh trước khi đăng ký." />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {blogs.map((blog) => (
          <Link key={blog.id} href={`/blog/${blog.slug}`}>
            <Card className="h-full transition hover:-translate-y-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss">Bài viết</p>
              <h2 className="mt-4 font-display text-2xl font-black text-ink">{blog.title}</h2>
              <p className="mt-3 text-sm leading-6 text-ink/65">{blog.excerpt}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
