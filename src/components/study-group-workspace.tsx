"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, Copy, LogOut, Plus, Trash2, UsersRound } from "lucide-react";

type SharedExam = {
  id: string; title: string; subject: string; duration: number;
  questions: number; sharedBy: string; canRemove: boolean;
};
type Group = {
  id: string; name: string; joinCode: string; isOwner: boolean;
  currentUserId: string; members: { id: string; name: string }[]; exams: SharedExam[];
};
type MyExam = { id: string; title: string; subject: string };

export function StudyGroupWorkspace({ group, myExams }: { group: Group; myExams: MyExam[] }) {
  const router = useRouter();
  const [examId, setExamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const availableExams = myExams.filter((exam) => !group.exams.some((shared) => shared.id === exam.id));

  async function action(url: string, method: "POST" | "DELETE", body?: Record<string, string>) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể thực hiện.");
      setExamId("");
      if (url.endsWith("/exams")) {
        setMessage(method === "POST" ? "Đã chia sẻ đề vào nhóm." : "Đã gỡ đề khỏi nhóm.");
        router.refresh();
      } else {
        router.push("/nhom-hoc");
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(group.joinCode);
      setMessage("Đã sao chép mã mời.");
    } catch {
      setMessage("Không thể sao chép. Bạn có thể chọn và chép mã trực tiếp.");
    }
  }

  function leaveOrDelete() {
    const warning = group.isOwner
      ? "Xóa nhóm sẽ thu hồi toàn bộ quyền truy cập đề qua nhóm. Bạn chắc chắn muốn xóa?"
      : "Rời nhóm sẽ khiến bạn không còn quyền mở các đề riêng của nhóm. Tiếp tục?";
    if (window.confirm(warning)) void action(`/api/study-groups/${group.id}`, "DELETE");
  }

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fffdf6] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/nhom-hoc" className="text-sm font-bold text-orange-600 hover:underline">← Tất cả nhóm</Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-500">Nhóm học tập riêng tư</p>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">{group.name}</h1>
            <p className="mt-2 text-sm text-slate-500">{group.members.length} thành viên · {group.exams.length} đề luyện chung</p>
          </div>
          <button onClick={leaveOrDelete} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">
            {group.isOwner ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
            {group.isOwner ? "Xóa nhóm" : "Rời nhóm"}
          </button>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-black"><UsersRound className="h-5 w-5 text-orange-500" /> Mời bạn học cùng</h2>
            <p className="mt-2 text-sm text-slate-500">Gửi mã này cho bạn bè đã có tài khoản Educhi. Chỉ người tham gia nhóm mới thấy kho đề chung.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <code className="rounded-xl bg-orange-50 px-4 py-3 text-lg font-black tracking-widest text-orange-700">{group.joinCode}</code>
              <button onClick={copyCode} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-700">
                <Copy className="h-4 w-4" /> Sao chép mã
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-500">Tối đa 100 thành viên/nhóm. Không chia sẻ mã công khai nếu đề chỉ dành cho bạn bè.</p>
          </section>
          <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-black"><Plus className="h-5 w-5 text-orange-500" /> Góp đề vào nhóm</h2>
            <p className="mt-2 text-sm text-slate-500">Chọn một đề bạn đã tạo trong kho cá nhân. Không cần tải lên lần nữa.</p>
            <select aria-label="Chọn đề để chia sẻ" value={examId} onChange={(e) => setExamId(e.target.value)}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400">
              <option value="">Chọn đề của bạn...</option>
              {availableExams.map((exam) => <option key={exam.id} value={exam.id}>{exam.subject} · {exam.title}</option>)}
            </select>
            <button disabled={busy || !examId} onClick={() => void action(`/api/study-groups/${group.id}/exams`, "POST", { examId })}
              className="mt-3 w-full rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50">
              Chia sẻ vào nhóm
            </button>
            <Link href="/exams/create" className="mt-3 block text-center text-sm font-bold text-orange-600 hover:underline">+ Tạo đề mới</Link>
          </section>
        </div>
        {message ? <p role="status" className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">{message}</p> : null}

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-black"><BookOpen className="h-6 w-6 text-orange-500" /> Kho đề chung</h2>
          {group.exams.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-orange-200 bg-white p-8 text-center text-slate-500">
              Nhóm chưa có đề nào. Hãy chia sẻ một đề từ kho cá nhân để mọi người bắt đầu luyện.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {group.exams.map((exam) => (
                <article key={exam.id} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">{exam.subject}</span>
                  <h3 className="mt-3 text-lg font-black">{exam.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{exam.questions} câu · {exam.duration} phút · Do {exam.sharedBy} chia sẻ</p>
                  <div className="mt-4 flex items-center gap-2">
                    <Link href={`/exams/${exam.id}`} className="inline-flex rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white hover:bg-orange-600">
                      Vào làm đề
                    </Link>
                    {exam.canRemove ? (
                      <button disabled={busy} onClick={() => {
                        if (window.confirm("Gỡ đề này khỏi nhóm?")) void action(`/api/study-groups/${group.id}/exams`, "DELETE", { examId: exam.id });
                      }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                        Gỡ đề
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="mt-9 rounded-2xl border border-orange-100 bg-white p-5">
          <h2 className="font-black">Thành viên ({group.members.length})</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.members.map((member) => <span key={member.id}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">
              {member.name}{member.id === group.currentUserId ? " (bạn)" : ""}
            </span>)}
          </div>
        </section>
      </div>
    </main>
  );
}
