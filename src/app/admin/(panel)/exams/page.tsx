import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminExamsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-black text-ink">Admin · Đề thi</h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">Đề THPTQG chính thức: tạo bản nháp với isPublished=false, nhập câu hỏi ở mục Admin · Câu hỏi, rồi cập nhật isPublished=true. Hệ thống sẽ kiểm tra thời gian, số câu, dạng câu và điểm theo từng môn trước khi xuất bản. Đề các cấp học khác được tự chọn cấu trúc và số câu.</p>
      <div className="mt-8">
        <AdminResourceManager
          resource="exams"
          defaultPayload={{
            code: "",
            slug: "",
            title: "",
            description: "",
            family: "THPTQG",
            type: "MOCK",
            accessLevel: "FREE",
            year: new Date().getFullYear(),
            durationMinutes: 90,
            educationLevel: "THPTQG",
            targetScore: 8,
            subjectId: "",
            isPublished: false,
          }}
        />
      </div>
    </main>
  );
}
