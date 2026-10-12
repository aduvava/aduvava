import { Badge, Card } from "@/components/ui";

export default function AboutPage() {
  return (
    <div className="hide-site-header mx-auto max-w-6xl px-4 py-16 md:px-6">
      <Badge>Về chúng tôi</Badge>
      <h1 className="mt-6 font-display text-5xl font-black leading-tight text-ink md:text-7xl">Một sản phẩm luyện thi tối giản, đo được, dễ mở rộng.</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-ink/70">Ava tập trung vào luồng cốt lõi: học sinh làm đề, hệ thống chấm điểm, dashboard chỉ ra điểm yếu và Admin quản trị nội dung. Mọi số liệu hiển thị đều được đọc từ dữ liệu học tập đã ghi nhận.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[
          ["Dữ liệu minh bạch", "Không dựng số liệu mẫu khi database chưa có nội dung."],
          ["Tập trung học tập", "Đề thi, bài làm và tiến độ được tổ chức trong một luồng thống nhất."],
          ["Dễ quản trị", "Admin có thể xuất bản môn học, đề thi, lý thuyết và tài liệu từ khu quản trị."]
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
