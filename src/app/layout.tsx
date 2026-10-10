import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const vietnameseSans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-slowedu",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ava",
  description: "Nền tảng luyện đề, dashboard học tập, tài liệu, lớp học và cửa hàng EXP cho học sinh.",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={vietnameseSans.variable}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
