export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-sand">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr] md:px-6">
        <div>
          <div className="font-display text-2xl font-black">Ava</div>
          <p className="mt-3 max-w-md text-sm leading-6 text-sand/70">
            Nền tảng luyện đề, chữa lỗi, theo dõi tiến bộ, học theo lớp và tích EXP cho học sinh.
            Nội dung demo không sao chép thương hiệu hay học liệu độc quyền từ bên thứ ba.
          </p>
        </div>
        <div>
          <h3 className="font-bold">Liên hệ</h3>
          <p className="mt-3 text-sm text-sand/70">support@example.com</p>
          <p className="text-sm text-sand/70">09xx xxx xxx</p>
        </div>
      </div>
    </footer>
  );
}
