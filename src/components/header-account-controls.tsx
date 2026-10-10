"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOut } from "next-auth/react";
import { Crown, Gem, GraduationCap, History, LogOut, School, Target, Trophy, UserRound, X } from "lucide-react";

type HeaderAccountControlsProps = {
  initialExp: number;
  vipDaysLeft: number | null;
  user: { name: string; email: string; image: string | null; initials: string };
};

type StudentProfileForm = {
  grade: string;
  school: string;
  aspiration: string;
  targetScore: string;
};

const emptyProfile: StudentProfileForm = {
  grade: "",
  school: "",
  aspiration: "",
  targetScore: "",
};

const profileFields = [
  { key: "grade", label: "Lớp", placeholder: "Ví dụ: Lớp 12A1", Icon: GraduationCap },
  { key: "school", label: "Trường đang học", placeholder: "Ví dụ: THPT Nguyễn Trãi", Icon: School },
  { key: "aspiration", label: "Trường đại học mong muốn", placeholder: "Ví dụ: Đại học Bách khoa Hà Nội", Icon: Target },
  { key: "targetScore", label: "Điểm số mong muốn", placeholder: "Ví dụ: 27+ điểm", Icon: Trophy },
] as const;

export function HeaderAccountControls({ initialExp, vipDaysLeft, user }: HeaderAccountControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<StudentProfileForm>(emptyProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) return;
        const data = await response.json();
        const savedProfile = data.profile?.profile;
        if (!active || !savedProfile) return;
        setProfile({
          grade: savedProfile.grade ?? "",
          school: savedProfile.school ?? "",
          aspiration: savedProfile.aspiration ?? "",
          targetScore: savedProfile.targetScore ?? "",
        });
      } catch {
        if (active) setProfileMessage("Chưa tải được thông tin cá nhân.");
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [profileOpen]);

  function openProfile() {
    setMenuOpen(false);
    setProfileMessage(null);
    setProfileOpen(true);
  }

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, source: "avatar-menu" }),
      });
      if (!response.ok) throw new Error("Save failed");
      setProfileMessage("Đã lưu thông tin cá nhân.");
      setProfileOpen(false);
    } catch {
      setProfileMessage("Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setProfileSaving(false);
    }
  }

  function openPlans() {
    setMenuOpen(false);
    window.location.href = "/vip";
  }

  function openTransactionHistory() {
    setMenuOpen(false);
    if (window.location.pathname === "/dich-vu") {
      window.dispatchEvent(new Event("open-store-history"));
      return;
    }
    window.location.href = "/dich-vu?history=1";
  }

  return (
    <>
      <span className="hidden items-center gap-1.5 rounded-full bg-blue-50 px-3 py-2 text-sm font-extrabold text-blue-600 sm:inline-flex">
        <Gem className="h-4 w-4 fill-blue-500 text-blue-500" />
        {initialExp.toLocaleString("vi-VN")}
      </span>
      {vipDaysLeft ? (
        <span className="hidden items-center gap-1.5 rounded-full bg-orange-50 px-3 py-2 text-sm font-extrabold text-orange-600 lg:inline-flex">
          <Crown className="h-4 w-4 fill-orange-500 text-orange-500" />
          VIP còn {vipDaysLeft} ngày
        </span>
      ) : null}

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Mở menu tài khoản"
          aria-expanded={menuOpen}
          className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-black text-white ring-2 ring-orange-100 transition hover:ring-orange-300"
        >
          {user.image ? <img src={user.image} alt="" className="h-full w-full object-cover" /> : user.initials}
        </button>

        {menuOpen ? (
          <div className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-100 bg-orange-50/60 p-5">
              <p className="truncate font-black text-slate-900">{user.name}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <div className="space-y-1 p-2">
              <button type="button" onClick={openProfile} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-orange-50 hover:text-orange-600">
                <UserRound className="h-5 w-5" /> Thông tin cá nhân
              </button>
              <button type="button" onClick={openPlans} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-orange-50 hover:text-orange-600">
                <Crown className="h-5 w-5" /> Nạp vip
              </button>
              <button type="button" onClick={openTransactionHistory} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-orange-50 hover:text-orange-600">
                <History className="h-5 w-5" /> Lịch sử giao dịch
              </button>
              <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-rose-600 transition hover:bg-rose-50">
                <LogOut className="h-5 w-5" /> Đăng xuất
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {profileOpen
        ? createPortal(
            <div className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-md">
              <div className="relative z-[10000] flex max-h-[calc(100vh-3rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.34)]">
                <div className="flex items-start justify-between gap-4 border-b border-orange-100 bg-orange-50/70 p-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">Hồ sơ học tập</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">Thông tin cá nhân</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Điền thông tin để Ava gợi ý lộ trình học phù hợp hơn.</p>
                  </div>
                  <button type="button" onClick={() => setProfileOpen(false)} aria-label="Đóng" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-orange-500">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                  {profileFields.map(({ key, label, placeholder, Icon }) => (
                    <label key={key} className="block">
                      <span className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-700">
                        <Icon className="h-4 w-4 text-orange-500" />
                        {label}
                      </span>
                      <input
                        value={profile[key]}
                        onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))}
                        placeholder={placeholder}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
                      />
                    </label>
                  ))}
                  {profileMessage ? <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-600">{profileMessage}</p> : null}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
                  <button type="button" onClick={() => setProfileOpen(false)} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-extrabold text-slate-600 transition hover:bg-slate-200">
                    Để sau
                  </button>
                  <button type="button" onClick={saveProfile} disabled={profileSaving} className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300">
                    {profileSaving ? "Đang lưu..." : "Lưu thông tin"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
