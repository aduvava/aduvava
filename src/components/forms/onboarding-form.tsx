"use client";

import { useState } from "react";
import { normalizeProvince, normalizeSchoolGrade, SCHOOL_GRADES, VIETNAM_PROVINCES } from "@/data/profile-options";

type OnboardingFormProps = {
  nextPath?: string;
  initialProfile?: {
    grade?: string | null;
    school?: string | null;
    province?: string | null;
    aspiration?: string | null;
    targetScore?: string | null;
  } | null;
};

export function OnboardingForm({ initialProfile, nextPath = "/dashboard" }: OnboardingFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const initialGrade = normalizeSchoolGrade(initialProfile?.grade);
  const initialProvince = normalizeProvince(initialProfile?.province);

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
    if (response.ok) {
      // Full navigation avoids stale cached server components after the profile update.
      window.location.assign(nextPath);
    } else {
      const data = await response.json().catch(() => null);
      setMessage(data?.error ?? "Không lưu được hồ sơ. Vui lòng kiểm tra thông tin và thử lại.");
    }
  }

  return (
    <form action={submit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Lớp
        <select name="grade" required defaultValue={initialGrade} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100">
          <option value="" disabled>Chọn lớp</option>
          {SCHOOL_GRADES.map((grade) => <option key={grade} value={grade}>Lớp {grade}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Trường đang học
        <input name="school" required defaultValue={initialProfile?.school ?? ""} placeholder="Ví dụ: THPT Nguyễn Trãi" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Tỉnh/thành
        <select name="province" required defaultValue={initialProvince} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100">
          <option value="" disabled>Chọn tỉnh/thành</option>
          {VIETNAM_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Điểm số mong muốn
        <input name="targetScore" defaultValue={initialProfile?.targetScore ?? ""} placeholder="Ví dụ: 27+ điểm" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Trường đại học mong muốn (không bắt buộc)
        <textarea name="aspiration" defaultValue={initialProfile?.aspiration ?? ""} placeholder="Ví dụ: Đại học Bách khoa Hà Nội" className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
      </label>
      <button className="min-h-12 w-full rounded-full px-5 py-3 font-extrabold text-white shadow-md transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2" style={{ backgroundColor: "#f97316", color: "#ffffff", visibility: "visible", opacity: 1 }} type="submit">HOÀN TẤT &amp; TIẾP TỤC</button>
      {message ? <p role="status" className="text-sm font-semibold text-slate-700">{message}</p> : null}
    </form>
  );
}
