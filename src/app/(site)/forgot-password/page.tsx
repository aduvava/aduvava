import { Card } from "@/components/ui";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-5xl place-items-center px-4 py-16 md:px-6">
      <Card className="w-full max-w-md">
        <h1 className="font-display text-4xl font-black text-ink">Quên mật khẩu</h1>
        <p className="mt-3 text-sm leading-6 text-ink/65">V1 chưa gửi email thật. Admin có thể tạo lại mật khẩu bằng API admin hoặc cập nhật trực tiếp trong database.</p>
      </Card>
    </div>
  );
}
