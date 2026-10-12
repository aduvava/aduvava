import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-sand">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr] md:px-6">
        <div>
          <div className="font-display text-2xl font-black">Ava</div>
          <p className="mt-3 max-w-md text-sm leading-6 text-sand/70">
            Nền tảng luyện đề, chữa lỗi, theo dõi tiến bộ, học theo lớp và tích EXP cho học sinh.
          </p>
        </div>
        <div>
          <h3 className="font-bold">Liên hệ</h3>
          <Link href="/contact" className="mt-3 inline-flex text-sm font-bold text-sand/70 hover:text-white">Gửi yêu cầu hỗ trợ</Link>
        </div>
      </div>
    </footer>
  );
}
