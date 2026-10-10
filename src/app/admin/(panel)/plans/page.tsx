import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminPlansPage() {
  return (
    <main className="space-y-8 p-6 lg:p-10">
      <div>
        <h1 className="text-4xl font-black text-ink">Admin · Gói thành viên</h1>
        <p className="mt-3 text-sm text-ink/65">Điều chỉnh tên gói, giá bán, trạng thái và quyền lợi hiện trên trang thanh toán.</p>
      </div>
      <AdminResourceManager
        resource="plans"
        defaultPayload={{
          slug: "ava-monthly",
          name: "Toàn Diện",
          description: "Gói học tập đầy đủ cho học sinh ôn luyện hằng tháng.",
          price: 99000,
          interval: "MONTH",
          features: [
            "Mở khóa trọn bộ kho đề chuẩn THPT",
            "Hệ thống đáp án và cơ sở lý thuyết chuyên sâu",
            "Phân tích năng lực chi tiết",
            "Tham gia bảng xếp hạng thi đua",
          ],
          isActive: true,
        }}
      />
    </main>
  );
}
