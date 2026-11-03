import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { OnboardingForm } from "@/components/forms/onboarding-form";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safePostLoginPath } from "@/lib/onboarding";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const params = await searchParams;
  const next = safePostLoginPath(params.callbackUrl, "/dashboard");
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=student&callbackUrl=/onboarding");
  if (user.role === "TEACHER") redirect("/teacher");
  if (user.role === "ADMIN") redirect("/admin");

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: {
      grade: true,
      school: true,
      province: true,
      aspiration: true,
      targetScore: true,
    },
  });

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-5xl place-items-center px-4 py-16 md:px-6">
      <Card className="w-full max-w-xl">
        <h1 className="font-display text-4xl font-black text-ink">Hoàn thiện thông tin cá nhân</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Bạn đã đăng nhập thành công. Hoàn thiện thông tin học tập một lần để Eduva gợi ý nội dung phù hợp.</p>
        <div className="mt-6"><OnboardingForm initialProfile={profile} nextPath={next} /></div>
      </Card>
    </div>
  );
}
