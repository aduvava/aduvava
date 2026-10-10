import { prisma } from "@/lib/db";
import { DocumentModeration } from "@/components/admin/document-moderation";

export default async function AdminDocumentsPage() {
  const documents = await prisma.document.findMany({
    include: {
      uploader: { select: { name: true, email: true } },
      ratings: { select: { rating: true } },
      reports: { where: { status: "OPEN" }, select: { id: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <h1 className="text-4xl font-black text-slate-900">Duyệt tài liệu</h1>
      <p className="mt-3 text-sm text-slate-500">Phê duyệt để công khai tài liệu và tự động cộng 50 EXP cho người đăng.</p>
      <div className="mt-8">
        <DocumentModeration
          documents={documents.map((document) => ({
            id: document.id,
            title: document.title,
            description: document.description,
            grade: document.grade,
            subject: document.subject,
            type: document.type,
            status: document.status,
            originalName: document.originalName,
            uploaderName: document.uploader.name ?? document.uploader.email,
            downloads: document.downloads,
            averageRating: document.ratings.length ? document.ratings.reduce((sum, item) => sum + item.rating, 0) / document.ratings.length : 0,
            reports: document.reports.length,
            createdAt: document.createdAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
