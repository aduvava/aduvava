"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OnboardingFormProps = {
  initialProfile?: {
    grade?: string | null;
    school?: string | null;
    province?: string | null;
    aspiration?: string | null;
    targetScore?: string | null;
  } | null;
};

export function OnboardingForm({ initialProfile }: OnboardingFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function submit(formData: FormData) {
    setMessage("Đang lưu hồ sơ...");
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grade: formData.get("grade"),
        school: formData.get("school"),
        province: formData.get("province"),
        aspiration: formData.get("aspiration"),
        targetScore: formData.get("targetScore"),
        source: "onboarding"
      })
    });
    if (response.ok) router.push("/dashboard");
    else setMessage("Không lưu được hồ sơ.");
  }

  return (
    <form action={submit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Lớp
        <input name="grade" required defaultValue={initialProfile?.grade ?? ""} placeholder="Ví dụ: Lớp 12A1" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Trường đang học
        <input name="school" required defaultValue={initialProfile?.school ?? ""} placeholder="Ví dụ: THPT Nguyễn Trãi" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Tỉnh/thành
        <input name="province" required defaultValue={initialProfile?.province ?? ""} placeholder="Ví dụ: Hà Nội" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Điểm số mong muốn
        <input name="targetScore" defaultValue={initialProfile?.targetScore ?? ""} placeholder="Ví dụ: 27+ điểm" className="rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Trường đại học mong muốn
        <textarea name="aspiration" required defaultValue={initialProfile?.aspiration ?? ""} placeholder="Ví dụ: Đại học Bách khoa Hà Nội" className="min-h-28 rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss" />
      </label>
      <button className="rounded-full bg-ink px-5 py-3 font-bold text-white" type="submit">Vào dashboard</button>
      {message ? <p className="text-sm font-semibold text-ink/65">{message}</p> : null}
    </form>
  );
}
