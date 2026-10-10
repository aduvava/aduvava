import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminBlogsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-black text-ink">Admin · Blog</h1>
      <div className="mt-8">
        <AdminResourceManager
          resource="blogs"
          defaultPayload={{
            slug: "cach-chua-loi-sau-moi-de",
            title: "Cách chữa lỗi sau mỗi đề",
            excerpt: "Biến câu sai thành checklist học tập.",
            content: "Nội dung bài viết...",
            status: "PUBLISHED",
            publishedAt: "2026-06-13T00:00:00.000Z",
          }}
        />
      </div>
    </main>
  );
}
