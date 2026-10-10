"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  CalendarDays,
  Check,
  Grid2X2,
  KeyRound,
  List,
  MessageCircleMore,
  Plus,
  School,
  Search,
  Users,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { defaultClassrooms, type Classroom } from "@/data/classrooms";
import { MascotAvatar } from "@/components/mascot-avatar";

type ViewMode = "grid" | "list";
type ModalMode = "create" | "join" | null;

const storageKey = "slowedu-custom-classrooms";
const coverOptions = [
  "from-orange-950 via-orange-600 to-amber-200",
  "from-blue-950 via-blue-600 to-cyan-200",
  "from-emerald-950 via-emerald-600 to-lime-200",
  "from-violet-950 via-violet-600 to-fuchsia-200",
];

function readCustomClassrooms() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as Classroom[];
  } catch {
    return [];
  }
}

function ClassroomCard({ classroom, view }: { classroom: Classroom; view: ViewMode }) {
  return (
    <article
      className={clsx(
        "group w-full max-w-[340px] overflow-hidden rounded-[1.25rem] border border-orange-100 bg-white shadow-[0_8px_18px_rgba(76,52,28,0.055)] transition hover:-translate-y-1 hover:shadow-[0_12px_26px_rgba(76,52,28,0.09)]",
        view === "list" && "md:grid md:grid-cols-[220px_minmax(0,1fr)]",
      )}
    >
      <div className={clsx("relative min-h-20 overflow-hidden bg-gradient-to-br sm:min-h-24", classroom.cover, view === "list" && "md:min-h-full")}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(255,255,255,0.32),transparent_24%),linear-gradient(120deg,transparent,rgba(255,255,255,0.12))]" />
        <School className="absolute bottom-3 right-5 h-12 w-12 text-white/25 transition duration-300 group-hover:scale-110 sm:h-14 sm:w-14" strokeWidth={1.3} />
        <span className="absolute bottom-3 left-4 rounded-full border border-white/35 bg-slate-950/35 px-3 py-1 text-[9px] font-black uppercase tracking-wide text-white backdrop-blur">
          {classroom.subject}
        </span>
        {classroom.newAssignments > 0 ? (
          <span className="absolute right-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-[9px] font-black uppercase text-white shadow-lg">
            {classroom.newAssignments} bài tập mới
          </span>
        ) : null}
      </div>

      <div className="p-3.5">
        <h2 className="text-base font-black text-slate-950">{classroom.name}</h2>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">{classroom.teacher}</p>
        <p className="mt-1.5 line-clamp-1 text-xs leading-5 text-slate-600">{classroom.description}</p>

        <div className="mt-2.5 grid gap-2 border-t border-slate-100 pt-2.5 sm:grid-cols-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <CalendarDays className="h-3.5 w-3.5 text-orange-500" /> {classroom.schedule}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 sm:justify-end">
            <Users className="h-3.5 w-3.5 text-blue-500" /> {classroom.students} học sinh
          </span>
        </div>

        <div className="mt-2.5">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span className="text-slate-500">Tiến độ học tập</span>
            <span className="text-orange-600">{classroom.progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={clsx("h-full rounded-full bg-gradient-to-r", classroom.accent)} style={{ width: `${classroom.progress}%` }} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <BookOpenCheck className="h-3.5 w-3.5" /> {classroom.assignments} bài tập
          </span>
          <Link
            href={`/classes/${classroom.id}`}
            className="rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-orange-600"
          >
            Vào lớp
          </Link>
        </div>
      </div>
    </article>
  );
}

function ClassroomModal({
  mode,
  onClose,
  onCreated,
}: {
  mode: Exclude<ModalMode, null>;
  onClose: () => void;
  onCreated: (classroom: Classroom) => void;
}) {
  const [message, setMessage] = useState("");

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const teacher = String(form.get("teacher") ?? "").trim();
    const subject = String(form.get("subject") ?? "").trim();
    if (!name || !teacher || !subject) {
      setMessage("Vui lòng nhập đủ tên lớp, giáo viên và môn học.");
      return;
    }
    const id = `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;
    onCreated({
      id,
      name,
      teacher,
      subject,
      description: String(form.get("description") ?? "Lớp học mới trên Ava").trim(),
      schedule: String(form.get("schedule") ?? "Chưa cập nhật").trim(),
      students: 1,
      assignments: 0,
      newAssignments: 0,
      progress: 0,
      accent: "from-orange-500 to-amber-400",
      cover: coverOptions[Math.floor(Math.random() * coverOptions.length)],
      code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    });
  }

  function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim().toUpperCase();
    const classroom = [...defaultClassrooms, ...readCustomClassrooms()].find((item) => item.code === code);
    if (!classroom) {
      setMessage("Không tìm thấy lớp. Hãy kiểm tra lại mã mời.");
      return;
    }
    setMessage(`Đã tham gia lớp “${classroom.name}”.`);
    window.setTimeout(onClose, 900);
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-600">
              {mode === "create" ? <Plus className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
            </span>
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              {mode === "create" ? "Tạo lớp học mới" : "Tham gia lớp học"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "create" ? "Thiết lập thông tin cơ bản để bắt đầu quản lý lớp." : "Nhập mã lớp do giáo viên gửi cho bạn."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === "create" ? (
          <form onSubmit={submitCreate} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-extrabold text-slate-700">Tên lớp</span>
              <input name="name" placeholder="Ví dụ: Toán 12 - K26" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" />
            </label>
            <label>
              <span className="text-sm font-extrabold text-slate-700">Giáo viên</span>
              <input name="teacher" placeholder="Tên giáo viên" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" />
            </label>
            <label>
              <span className="text-sm font-extrabold text-slate-700">Môn học</span>
              <input name="subject" placeholder="Toán học" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-extrabold text-slate-700">Lịch học</span>
              <input name="schedule" placeholder="Thứ 3, 5 - 19:30" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-extrabold text-slate-700">Mô tả</span>
              <textarea name="description" rows={3} placeholder="Nội dung và mục tiêu của lớp..." className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" />
            </label>
            {message ? <p className="text-sm font-bold text-rose-500 sm:col-span-2">{message}</p> : null}
            <button type="submit" className="rounded-2xl bg-orange-500 px-5 py-3 font-extrabold text-white hover:bg-orange-600 sm:col-span-2">
              Tạo lớp học
            </button>
          </form>
        ) : (
          <form onSubmit={submitJoin} className="mt-6">
            <input
              name="code"
              autoFocus
              placeholder="Nhập mã lớp, ví dụ TOAN26"
              className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-center text-lg font-black uppercase tracking-[0.18em] outline-none focus:border-orange-400"
            />
            {message ? <p className={clsx("mt-3 text-center text-sm font-bold", message.startsWith("Đã") ? "text-emerald-600" : "text-rose-500")}>{message}</p> : null}
            <button type="submit" className="mt-5 w-full rounded-2xl bg-orange-500 px-5 py-3 font-extrabold text-white hover:bg-orange-600">
              Tham gia lớp
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function ClassroomHub() {
  const [customClassrooms, setCustomClassrooms] = useState<Classroom[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [modal, setModal] = useState<ModalMode>(null);
  const [createdMessage, setCreatedMessage] = useState("");

  useEffect(() => setCustomClassrooms(readCustomClassrooms()), []);

  const classrooms = useMemo(() => [...customClassrooms, ...defaultClassrooms], [customClassrooms]);
  const filteredClassrooms = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return classrooms.filter((classroom) => {
      return !keyword || `${classroom.name} ${classroom.teacher} ${classroom.subject}`.toLocaleLowerCase("vi").includes(keyword);
    });
  }, [classrooms, search]);

  function addClassroom(classroom: Classroom) {
    const next = [classroom, ...customClassrooms];
    setCustomClassrooms(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setModal(null);
    setCreatedMessage(`Đã tạo “${classroom.name}”. Mã lớp: ${classroom.code}`);
    window.setTimeout(() => setCreatedMessage(""), 5000);
  }

  return (
    <div className="classroom-page min-h-screen bg-[#fffdf0] pb-24">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-orange-100 text-orange-600">
              <School className="h-10 w-10" />
            </span>
            <h1 className="text-4xl font-black uppercase tracking-tight text-slate-950 sm:text-5xl">Lớp học</h1>
          </div>
        </header>

        <section className="mt-10 flex flex-col gap-4 rounded-[2rem] border border-orange-100 bg-white p-4 shadow-sm xl:flex-row xl:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-slate-50 px-5 py-4">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm lớp học theo tên hoặc giáo viên..."
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setModal("join")} className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3.5 text-sm font-extrabold text-orange-600 hover:bg-orange-100">
              <KeyRound className="h-4 w-4" /> Tham gia lớp
            </button>
            <div className="flex rounded-2xl bg-slate-50 p-1">
              <button type="button" onClick={() => setView("grid")} aria-label="Xem dạng lưới" className={clsx("grid h-11 w-11 place-items-center rounded-xl transition", view === "grid" ? "bg-white text-orange-500 shadow-sm" : "text-slate-400")}>
                <Grid2X2 className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => setView("list")} aria-label="Xem dạng danh sách" className={clsx("grid h-11 w-11 place-items-center rounded-xl transition", view === "list" ? "bg-white text-orange-500 shadow-sm" : "text-slate-400")}>
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {createdMessage ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            <Check className="h-5 w-5" /> {createdMessage}
          </div>
        ) : null}

        <div className={clsx("mt-6 grid justify-items-start gap-4", view === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
          {filteredClassrooms.map((classroom) => <ClassroomCard key={classroom.id} classroom={classroom} view={view} />)}
        </div>

        {!filteredClassrooms.length ? (
          <div className="mt-8 rounded-[2rem] border border-dashed border-orange-200 bg-white p-12 text-center">
            <Search className="mx-auto h-10 w-10 text-orange-300" />
            <h2 className="mt-3 text-xl font-black text-slate-900">Không tìm thấy lớp học</h2>
            <p className="mt-2 text-sm text-slate-500">Thử đổi từ khóa tìm kiếm lớp học.</p>
          </div>
        ) : null}
      </div>

      {modal ? <ClassroomModal mode={modal} onClose={() => setModal(null)} onCreated={addClassroom} /> : null}
      <button type="button" aria-label="Hỗ trợ lớp học" className="fixed bottom-6 right-5 z-40 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-4 border-orange-500 bg-white shadow-[0_14px_35px_rgba(249,115,22,0.38)] transition hover:-translate-y-1">
        <MascotAvatar />
      </button>
    </div>
  );
}
