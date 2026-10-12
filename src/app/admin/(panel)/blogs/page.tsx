import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminBlogsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-black text-ink">Admin · Blog</h1>
      <div className="mt-8">
        <AdminResourceManager
          resource="blogs"
          defaultPayload={{
            slug: "",
            title: "",
            excerpt: "",
            content: "",
            status: "DRAFT",
            publishedAt: null,
          }}
        />
      </div>
    </main>
  );
}
