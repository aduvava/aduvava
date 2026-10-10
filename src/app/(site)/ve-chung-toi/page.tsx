import { Badge, Card } from "@/components/ui";

export default function AboutPage() {
  return (
    <div className="hide-site-header mx-auto max-w-6xl px-4 py-16 md:px-6">
      <Badge>Về chúng tôi</Badge>
      <h1 className="mt-6 font-display text-5xl font-black leading-tight text-ink md:text-7xl">Một sản phẩm luyện thi tối giản, đo được, dễ mở rộng.</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-ink/70">MVP này tập trung vào luồng cốt lõi: học sinh làm đề, hệ thống chấm điểm, dashboard chỉ ra điểm yếu, admin quản trị nội dung. AI và payment được đặt sau interface mock để tránh chi phí và rủi ro tích hợp sớm.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[
          ["Không sao chép", "Không dùng branding, mascot, nội dung độc quyền của website tham chiếu."],
          ["Simplicity first", "Không thêm abstraction hoặc feature vượt yêu cầu v1."],
          ["Có đường nâng cấp", "Provider AI/payment có thể thay bằng tích hợp thật mà không đổi UI/API chính."]
        ].map(([title, text]) => (
          <Card key={title}>
            <h2 className="font-display text-2xl font-black text-ink">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-ink/65">{text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
