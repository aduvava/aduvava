"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Download,
  FilePlus2,
  FileText,
  GraduationCap,
  MessageCircleMore,
  Plus,
  School,
  TrendingUp,
  Upload,
  Users,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { defaultClassrooms, type Classroom } from "@/data/classrooms";

export type TeacherTab = "overview" | "classes" | "exams" | "reports" | "documents";

type TeacherDashboardProps = {
  initialTab: TeacherTab;
  teacherName: string;
  stats: {
    studentCount: number;
    examCount: number;
    submittedCount: number;
    documentCount: number;
  };
  exams: {
    id: string;
    title: string;
    subject: string;
    duration: number;
    submissions: number;
    published: boolean;
  }[];
  documents: {
    id: string;
    title: string;
    subject: string;
    downloads: number;
    type: string;
  }[];
};

type Reminder = {
  id: number;
  title: string;
  classroom: string;
  due: string;
  status: "DUE" | "UPCOMING" | "DONE";
};

const reportBars = [
  ["T2", 58],
  ["T3", 76],
  ["T4", 64],
  ["T5", 88],
  ["T6", 72],
  ["T7", 94],
  ["CN", 81],
] as const;

const teacherClassStorageKey = "ava-teacher-created-classrooms";
const teacherClassCovers = [
  "from-slate-800 via-orange-700 to-amber-300",
  "from-sky-900 via-cyan-600 to-amber-100",
  "from-rose-900 via-pink-600 to-orange-200",
  "from-indigo-950 via-violet-700 to-fuchsia-300",
];

function readCreatedClassrooms() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(teacherClassStorageKey) ?? "[]") as Classroom[];
  } catch {
    return [];
  }
}

function EmptyMessage({ text }: { text: string }) {
  return <p className="rounded-2xl bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-500">{text}</p>;
}

export function TeacherDashboard({ initialTab, teacherName, stats, exams, documents }: TeacherDashboardProps) {
  const tab = initialTab;
  const [toast, setToast] = useState("");
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [createdClassrooms, setCreatedClassrooms] = useState<Classroom[]>(readCreatedClassrooms);
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: 1, title: "Duyệt học sinh mới", classroom: "Toán Thầy Hùng - K26", due: "Hôm nay, 20:00", status: "DUE" },
    { id: 2, title: "Chấm bài tự luận", classroom: "Luyện đề Anh Văn 12", due: "Ngày mai, 09:00", status: "UPCOMING" },
    { id: 3, title: "Đăng tài liệu tuần 4", classroom: "Văn học và Cuộc sống", due: "Thứ 6, 18:30", status: "UPCOMING" },
  ]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }

  function addReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const classroom = String(form.get("classroom") ?? "").trim();
    const due = String(form.get("due") ?? "").trim();

    if (!title || !due) {
      notify("Vui lòng nhập nội dung và thời hạn nhắc.");
      return;
    }

    setReminders((items) => [
      { id: Date.now(), title, classroom: classroom || "Không gắn lớp", due, status: "UPCOMING" },
      ...items,
    ]);
    event.currentTarget.reset();
    notify("Đã thêm lịch nhắc cho giáo viên.");
  }

  function completeReminder(id: number) {
    setReminders((items) => items.map((item) => (item.id === id ? { ...item, status: "DONE" } : item)));
    notify("Đã đánh dấu hoàn thành nhắc việc.");
  }

  function submitCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const className = String(form.get("className") ?? "").trim();
    const subject = String(form.get("subject") ?? "").trim();
    const schedule = String(form.get("schedule") ?? "").trim();
    const inviteCode = String(form.get("inviteCode") ?? "").trim().toUpperCase();
    const description = String(form.get("description") ?? "").trim();
    const studentLimit = Number(form.get("studentLimit") ?? 0);

    if (!className || !subject) {
      notify("Vui lòng nhập tên lớp và môn học.");
      return;
    }

    const id = `${className
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now()}`;
    const classroom: Classroom = {
      id,
      name: className,
      teacher: teacherName,
      subject,
      description: description || "Lớp học mới trên Ava.",
      schedule: schedule || "Chưa cập nhật lịch học",
      students: Number.isFinite(studentLimit) && studentLimit > 0 ? Math.min(studentLimit, 999) : 0,
      assignments: 0,
      newAssignments: 0,
      progress: 0,
      accent: "from-orange-500 to-amber-400",
      cover: teacherClassCovers[createdClassrooms.length % teacherClassCovers.length],
      code: inviteCode || Math.random().toString(36).slice(2, 8).toUpperCase(),
    };
    const next = [classroom, ...createdClassrooms];
    setCreatedClassrooms(next);
    window.localStorage.setItem(teacherClassStorageKey, JSON.stringify(next));
    setCreateClassOpen(false);
    notify(`Đã tạo lớp ${className}.`);
  }

  const overviewCards: { label: string; value: number; Icon: LucideIcon; color: string }[] = [
    { label: "Học sinh", value: stats.studentCount, Icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Đề thi", value: stats.examCount, Icon: BookOpenCheck, color: "bg-orange-50 text-orange-600" },
    { label: "Lượt nộp bài", value: stats.submittedCount, Icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
    { label: "Tài liệu", value: stats.documentCount, Icon: FileText, color: "bg-violet-50 text-violet-600" },
  ];

  const reportCards: { label: string; value: string; Icon: LucideIcon }[] = [
    { label: "Điểm trung bình", value: "8.2", Icon: TrendingUp },
    { label: "Tỷ lệ hoàn thành", value: "86%", Icon: CheckCircle2 },
    { label: "Học sinh hoạt động", value: String(Math.max(stats.studentCount, 45)), Icon: GraduationCap },
  ];
  const managedClassrooms = [...createdClassrooms, ...defaultClassrooms];

  return (
    <div className="teacher-dashboard min-h-screen bg-orange-50/40 pb-24">
      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
        {tab === "overview" ? (
          <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-orange-500">Không gian giáo viên</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Xin chào, {teacherName}
              </h1>
              <p className="mt-2 text-sm text-slate-500">Quản lý hoạt động giảng dạy tại một nơi.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => notify("Bạn không có thông báo mới.")}
                className="relative grid h-12 w-12 place-items-center rounded-2xl border border-orange-100 bg-white text-slate-500 shadow-sm"
              >
                <Bell className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => setCreateClassOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-orange-200">
                <Plus className="h-5 w-5" /> Tạo lớp mới
              </button>
            </div>
          </header>
        ) : null}

        {tab === "overview" ? (
          <>
            <section className="mt-7 grid gap-4 md:grid-cols-4">
              {overviewCards.map(({ label, value, Icon, color }) => (
                <article key={label} className="rounded-[1.5rem] border border-orange-100 bg-white p-4 shadow-sm">
                  <span className={clsx("grid h-10 w-10 place-items-center rounded-xl", color)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-sm font-extrabold text-slate-500">{label}</p>
                  <p className="mt-1 text-3xl font-black text-slate-950">{value.toLocaleString("vi-VN")}</p>
                </article>
              ))}
            </section>

            <section className="mt-7 grid items-start gap-6 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-950">Lớp học gần đây</h2>
                  <Link href="/teacher?tab=classes" className="text-sm font-extrabold text-orange-600">
                    Xem tất cả
                  </Link>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {defaultClassrooms.slice(0, 4).map((classroom) => (
                    <Link key={classroom.id} href={`/classes/${classroom.id}`} className="rounded-2xl bg-slate-50 p-5 transition hover:bg-orange-50">
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-orange-500">
                          <School className="h-5 w-5" />
                        </span>
                        {classroom.newAssignments ? (
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black text-rose-600">{classroom.newAssignments} bài mới</span>
                        ) : null}
                      </div>
                      <h3 className="mt-4 font-black text-slate-900">{classroom.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {classroom.students} học sinh · {classroom.schedule}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
              <aside className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Lịch nhắc</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">Nhắc việc giáo viên</h2>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-500">
                    <BellRing className="h-5 w-5" />
                  </span>
                </div>

                <form onSubmit={addReminder} className="mt-5 rounded-3xl border border-orange-100 bg-orange-50/50 p-4">
                  <label className="block">
                    <span className="text-xs font-black uppercase text-slate-500">Nội dung nhắc</span>
                    <input name="title" placeholder="Ví dụ: Nhắc chấm bài kiểm tra" className="mt-2 h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-300" />
                  </label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <label>
                      <span className="text-xs font-black uppercase text-slate-500">Lớp liên quan</span>
                      <input name="classroom" placeholder="Tên lớp" className="mt-2 h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-300" />
                    </label>
                    <label>
                      <span className="text-xs font-black uppercase text-slate-500">Thời hạn</span>
                      <input name="due" placeholder="Hôm nay, 20:00" className="mt-2 h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-300" />
                    </label>
                  </div>
                  <button type="submit" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600">
                    <Plus className="h-4 w-4" /> Thêm lịch nhắc
                  </button>
                </form>

                <div className="mt-5 space-y-3">
                  {reminders.map((reminder) => (
                    <div key={reminder.id} className={clsx("flex items-center gap-3 rounded-2xl p-4", reminder.status === "DONE" ? "bg-emerald-50" : reminder.status === "DUE" ? "bg-orange-50" : "bg-slate-50")}>
                      <span className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-full", reminder.status === "DONE" ? "bg-emerald-100 text-emerald-600" : reminder.status === "DUE" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600")}>
                        {reminder.status === "DONE" ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <strong className={clsx("truncate text-sm", reminder.status === "DONE" ? "text-slate-400 line-through" : "text-slate-800")}>{reminder.title}</strong>
                          <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase", reminder.status === "DUE" ? "bg-orange-500 text-white" : reminder.status === "DONE" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600")}>
                            {reminder.status === "DUE" ? "Đến hạn" : reminder.status === "DONE" ? "Xong" : "Sắp tới"}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500">{reminder.classroom}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-400">
                          <CalendarDays className="h-3.5 w-3.5" /> {reminder.due}
                        </p>
                      </div>
                      {reminder.status !== "DONE" ? (
                        <button type="button" onClick={() => completeReminder(reminder.id)} aria-label="Hoàn thành" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-400 transition hover:text-emerald-600">
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </aside>
            </section>
          </>
        ) : null}

        {tab === "classes" ? (
          <section className="mt-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Lớp học</p>
                <h2 className="mt-1 text-3xl font-black text-slate-950">Quản lí lớp</h2>
              </div>
              <button type="button" onClick={() => setCreateClassOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white">
                <Plus className="h-4 w-4" /> Tạo lớp
              </button>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {managedClassrooms.map((classroom) => (
                <article key={classroom.id} className="overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-sm">
                  <div className={clsx("h-28 bg-gradient-to-br", classroom.cover)} />
                  <div className="p-6">
                    <span className="text-xs font-black uppercase text-orange-500">{classroom.subject}</span>
                    <h3 className="mt-2 text-xl font-black text-slate-950">{classroom.name}</h3>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" /> {classroom.students} học sinh
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" /> {classroom.schedule}
                      </span>
                    </div>
                    <Link href={`/classes/${classroom.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-orange-600">
                      Quản lí lớp <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "exams" ? (
          <section className="mt-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-3xl font-black text-slate-950">Quản lý đề thi</h2>
              <Link href="/exams" className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white">
                <FilePlus2 className="h-4 w-4" /> Tạo đề mới
              </Link>
            </div>
            <div className="mt-6 overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-sm">
              {exams.length ? (
                exams.map((exam) => (
                  <div key={exam.id} className="flex flex-col gap-4 border-b border-slate-100 p-5 last:border-0 sm:flex-row sm:items-center">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                      <ClipboardList className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-black text-slate-900">{exam.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {exam.subject} · {exam.duration} phút · {exam.submissions} lượt làm
                      </p>
                    </div>
                    <span className={clsx("w-fit rounded-full px-3 py-1.5 text-[10px] font-black uppercase", exam.published ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                      {exam.published ? "Đã xuất bản" : "Bản nháp"}
                    </span>
                    <Link href={`/exams/${exam.id}`} className="text-sm font-extrabold text-orange-600">
                      Xem đề
                    </Link>
                  </div>
                ))
              ) : (
                <EmptyMessage text="Chưa có đề thi nào." />
              )}
            </div>
          </section>
        ) : null}

        {tab === "reports" ? (
          <section className="mt-7">
            <h2 className="text-3xl font-black text-slate-950">Báo cáo học tập</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {reportCards.map(({ label, value, Icon }) => (
                <article key={label} className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
                  <Icon className="h-6 w-6 text-orange-500" />
                  <p className="mt-5 text-sm font-bold text-slate-500">{label}</p>
                  <p className="mt-2 text-4xl font-black text-slate-950">{value}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-7 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">Hoạt động trong tuần</h3>
              <div className="mt-8 flex h-64 items-end justify-around gap-3 border-b border-slate-100">
                {reportBars.map(([day, value]) => (
                  <div key={day} className="flex h-full flex-1 flex-col items-center justify-end">
                    <span className="mb-2 text-xs font-black text-orange-600">{value}%</span>
                    <div className="w-full max-w-16 rounded-t-xl bg-gradient-to-t from-orange-500 to-amber-300" style={{ height: `${value}%` }} />
                    <span className="mt-3 text-xs font-bold text-slate-400">{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {tab === "documents" ? (
          <section className="mt-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-950">Tài liệu giảng dạy</h2>
                <p className="mt-3 flex max-w-2xl items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Tài liệu này chỉ sưu tầm, không chịu trách nhiệm về bản quyền.
                </p>
              </div>
              <Link href="/documents" className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white">
                <Upload className="h-4 w-4" /> Tải tài liệu lên
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {documents.length ? (
                documents.map((document) => (
                  <article key={document.id} className="flex items-center gap-4 rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-sm">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-black text-slate-900">{document.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {document.subject} · {document.type}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                      <Download className="h-4 w-4" /> {document.downloads}
                    </span>
                  </article>
                ))
              ) : (
                <EmptyMessage text="Chưa có tài liệu được duyệt." />
              )}
            </div>
          </section>
        ) : null}
      </div>

      {createClassOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/45 px-4 py-6 backdrop-blur-sm" onMouseDown={() => setCreateClassOpen(false)}>
          <div className="w-full max-w-3xl rounded-[2rem] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-orange-100 bg-orange-50/70 p-6">
              <div className="flex gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
                  <Plus className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">Tạo lớp học</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">Thông tin lớp học mới</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Điền các thông tin cơ bản để học sinh nhận diện và tham gia lớp dễ dàng.</p>
                </div>
              </div>
              <button type="button" onClick={() => setCreateClassOpen(false)} aria-label="Đóng" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-orange-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitCreateClass} className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-sm font-extrabold text-slate-700">Tên lớp</span>
                <input name="className" required placeholder="Ví dụ: Toán 12 - K26" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100" />
              </label>
              <label>
                <span className="text-sm font-extrabold text-slate-700">Môn học</span>
                <input name="subject" required placeholder="Toán học, Tiếng Anh..." className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100" />
              </label>
              <label>
                <span className="text-sm font-extrabold text-slate-700">Khối/Lớp</span>
                <input name="grade" placeholder="Ví dụ: Lớp 12" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100" />
              </label>
              <label>
                <span className="text-sm font-extrabold text-slate-700">Lịch học</span>
                <input name="schedule" placeholder="Thứ 3, 5 - 19:30" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100" />
              </label>
              <label>
                <span className="text-sm font-extrabold text-slate-700">Mã mời</span>
                <input name="inviteCode" placeholder="Ví dụ: TOAN26" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-800 outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100" />
              </label>
              <label>
                <span className="text-sm font-extrabold text-slate-700">Số học viên tối đa</span>
                <input name="studentLimit" type="number" min="1" placeholder="Ví dụ: 50" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100" />
              </label>
              <label>
                <span className="text-sm font-extrabold text-slate-700">Trạng thái</span>
                <select name="status" defaultValue="open" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100">
                  <option value="open">Đang tuyển học viên</option>
                  <option value="private">Riêng tư</option>
                  <option value="draft">Bản nháp</option>
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="text-sm font-extrabold text-slate-700">Mô tả lớp học</span>
                <textarea name="description" rows={4} placeholder="Mục tiêu học tập, nội dung chính, yêu cầu đầu vào..." className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100" />
              </label>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setCreateClassOpen(false)} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-extrabold text-slate-600 transition hover:bg-slate-200">
                  Hủy
                </button>
                <button type="submit" className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600">
                  Tạo lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? <div className="fixed bottom-7 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div> : null}
      <button
        type="button"
        onClick={() => notify("Đã mở hỗ trợ dành cho giáo viên.")}
        aria-label="Hỗ trợ"
        className="fixed bottom-6 right-5 z-50 grid h-16 w-16 place-items-center rounded-full bg-orange-500 text-white shadow-[0_14px_35px_rgba(249,115,22,0.38)]"
      >
        <MessageCircleMore className="h-7 w-7" />
      </button>
    </div>
  );
}


