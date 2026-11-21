"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BookOpen, ChevronRight, Plus, UsersRound, KeyRound } from "lucide-react";

type Group = { id: string; name: string; isOwner: boolean; members: number; exams: number };

export function StudyGroupsHub({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");

  async function submit(event: FormEvent, action: "create" | "join") {
    event.preventDefault();
    if (busy) return;
    setBusy(action);
    setError("");
    try {
      const response = await fetch(action === "create" ? "/api/study-groups" : "/api/study-groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "create" ? { name: name.trim() } : { code: code.trim().toUpperCase() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Không thể thực hiện yêu cầu.");
      router.push(`/nhom-hoc/${body.group.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fffdf6] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/exams/my" className="text-sm font-bold text-orange-600 hover:underline">← Kho đề của tôi</Link>
        <div className="mt-5 flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 text-orange-600"><UsersRound className="h-7 w-7" /></div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-500">Học cùng nhau</p>
            <h1 className="text-3xl font-black sm:text-4xl">Nhóm học tập</h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          Một người tạo đề, cả nhóm cùng luyện. Chỉ thành viên nhóm mới mở được đề riêng được chia sẻ;
          điểm và lịch sử làm bài của mỗi người vẫn độc lập.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <form onSubmit={(e) => submit(e, "create")} className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-black"><Plus className="h-5 w-5 text-orange-500" /> Tạo nhóm mới</h2>
            <p className="mt-2 text-sm text-slate-500">Ví dụ: Nhóm ôn thi 11A1</p>
            <label className="mt-4 block text-sm font-bold" htmlFor="group-name">Tên nhóm</label>
            <input id="group-name" value={name} maxLength={80} minLength={3} required
              onChange={(e) => setName(e.target.value)}
              placeholder="Đặt tên cho nhóm của bạn"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" />
            <button disabled={busy !== null} className="mt-4 w-full rounded-xl bg-orange-500 px-5 py-3 font-black text-white hover:bg-orange-600 disabled:opacity-60">
              {busy === "create" ? "Đang tạo..." : "Tạo nhóm"}
            </button>
          </form>
          <form onSubmit={(e) => submit(e, "join")} className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-black"><KeyRound className="h-5 w-5 text-orange-500" /> Vào nhóm bạn bè</h2>
            <p className="mt-2 text-sm text-slate-500">Nhập mã mời do người trong nhóm gửi.</p>
            <label className="mt-4 block text-sm font-bold" htmlFor="group-code">Mã nhóm (10 ký tự)</label>
            <input id="group-code" value={code} maxLength={10} minLength={10} required
              autoCapitalize="characters" onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: ABCD2345XY"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono tracking-widest outline-none focus:border-orange-400" />
            <button disabled={busy !== null} className="mt-4 w-full rounded-xl bg-slate-900 px-5 py-3 font-black text-white hover:bg-slate-700 disabled:opacity-60">
              {busy === "join" ? "Đang tham gia..." : "Tham gia nhóm"}
            </button>
          </form>
        </div>
        {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

        <div className="mt-10 flex items-center justify-between">
          <h2 className="text-xl font-black">Nhóm của tôi ({groups.length})</h2>
        </div>
        {groups.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-orange-200 bg-white p-8 text-center text-slate-500">
            Chưa có nhóm nào. Hãy tạo nhóm hoặc nhập mã mời để bắt đầu.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {groups.map((group) => (
              <Link key={group.id} href={`/nhom-hoc/${group.id}`}
                className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition hover:border-orange-300">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-orange-500"><BookOpen /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black">{group.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{group.members} thành viên · {group.exams} đề {group.isOwner ? "· Nhóm trưởng" : ""}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
