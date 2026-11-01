import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { RegisterForm } from "@/components/forms/register-form";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  await searchParams;

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-5xl place-items-center px-4 py-16 md:px-6">
      <Card className="w-full max-w-lg">
        <h1 className="font-display text-4xl font-black text-ink">Tạo tài khoản học sinh</h1>
        <p className="mt-3 text-sm text-ink/65">Tài khoản mới được tạo với quyền học sinh. Quyền giáo viên cần được quản trị viên xác minh và cấp riêng.</p>
        <div className="mt-6">
          <Suspense fallback={<p>Đang tải form...</p>}>
            <RegisterForm />
          </Suspense>
        </div>
        <p className="mt-5 text-sm text-ink/65">Đã có tài khoản? <Link href="/login?role=student" className="font-bold text-clay">Đăng nhập</Link></p>
      </Card>
    </div>
  );
}
