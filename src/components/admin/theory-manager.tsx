"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, FileText, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { THEORY_GRADE_OPTIONS, gradeToLevel, theorySlug } from "@/lib/theory-admin";

type Subject = { id: string; name: string; slug: string };
type Chapter = { id: string; subjectId: string; grade: string | null; educationLevel: string | null; title: string; description: string | null; position: number; isPublished: boolean; slug: string; _count?: { lessons: number }; subject?: Subject };
type Lesson = { id: string; title: string; summary: string | null; content: string; position: number; accessLevel: "FREE" | "PRO"; isPublished: boolean; chapterId: string; fileOriginalName?: string | null; fileMimeType?: string | null; chapter?: Chapter & { subject?: Subject } };

const field = "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const inputBox = "rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6";
const button = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50";
const label = "grid gap-1.5 text-sm font-extrabold text-slate-700";

async function getItems<T>(resource: string): Promise<T[]> {
  const response = await fetch("/api/admin/" + resource, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Không tải được dữ liệu.");
  return data.items ?? [];
}

async function apiMessage(response: Response) {
  const body = await response.json().catch(() => ({}));
  return body.error ?? (response.status === 409 ? "Dữ liệu này đang được sử dụng hoặc trùng tên." : "Thao tác thất bại.");
}

export function TheoryChapterManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [grade, setGrade] = useState("Lớp 6");
  const [subjectId, setSubjectId] = useState("");
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [position, setPosition] = useState(1);
  const [isPublished, setIsPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [subjects, chapters] = await Promise.all([getItems<Subject>("subjects"), getItems<Chapter>("theory-chapters")]);
      setSubjects(subjects);
      setChapters(chapters);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không tải được dữ liệu."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => chapters.filter((chapter) => chapter.grade === grade && (!subjectId || chapter.subjectId === subjectId)), [chapters, grade, subjectId]);

  function reset() {
    setEditing(null); setTitle(""); setDescription(""); setPosition(visible.length + 1); setIsPublished(true);
  }

  function edit(chapter: Chapter) {
    setEditing(chapter); setGrade(chapter.grade ?? "Lớp 6"); setSubjectId(chapter.subjectId);
    setTitle(chapter.title); setDescription(chapter.description ?? ""); setPosition(chapter.position); setIsPublished(chapter.isPublished);
    setMessage("Đang sửa chương đã chọn.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subjectId || !title.trim()) return setMessage("Chọn môn và nhập tên chương.");
    const educationLevel = gradeToLevel(grade);
    if (!educationLevel) return setMessage("Lớp không hợp lệ.");
    setBusy(true); setMessage("Đang lưu chương...");
    try {
      const payload = {
        subjectId, educationLevel, grade,
        title: title.trim(),
        slug: editing?.slug ?? theorySlug(grade + " " + title),
        description: description.trim() || null,
        position: Number(position), isPublished,
      };
      const url = editing ? "/api/admin/theory-chapters/" + editing.id : "/api/admin/theory-chapters";
      const response = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(await apiMessage(response));
      await load(); reset(); setMessage(editing ? "Đã cập nhật chương." : "Đã tạo chương. Bạn có thể thêm bài ở mục Bài lý thuyết.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được chương."); }
    finally { setBusy(false); }
  }

  async function remove(chapter: Chapter) {
    if (chapter._count?.lessons) return setMessage("Chương đang có bài. Xóa hoặc chuyển các bài trước khi xóa chương.");
    if (!window.confirm(`Xóa chương "${chapter.title}"?`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/theory-chapters/" + chapter.id, { method: "DELETE" });
      if (!response.ok) throw new Error(await apiMessage(response));
      await load(); setMessage("Đã xóa chương."); if (editing?.id === chapter.id) reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không xóa được chương."); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(310px,0.9fr)_minmax(330px,1.1fr)]">
      <section className={inputBox}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">{editing ? "Sửa chương" : "Tạo chương mới"}</h2>
          {editing ? <button type="button" onClick={reset} className="text-sm font-black text-orange-600">+ Tạo mới</button> : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">Chỉ chọn lớp, môn và nhập tên chương. Các bài lý thuyết sẽ tự lấy danh sách chương này.</p>
        <form onSubmit={save} className="mt-5 grid gap-4">
          <label className={label}>Lớp / kỳ thi
            <select className={field} value={grade} onChange={(event) => { setGrade(event.target.value); setEditing(null); }}>
              {THEORY_GRADE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </label>
          <label className={label}>Môn học
            <select className={field} required value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setEditing(null); }}>
              <option value="">Chọn môn học</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label className={label}>Tên chương
            <input className={field} required maxLength={250} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Chương 1. Số tự nhiên" />
          </label>
          <label className={label}>Mô tả (không bắt buộc)
            <textarea className={field} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Giới thiệu nội dung chương..." />
          </label>
          <div className="grid grid-cols-[1fr_auto] items-end gap-4">
            <label className={label}>Thứ tự hiển thị
              <input type="number" min={0} max={100000} className={field} value={position} onChange={(event) => setPosition(Number(event.target.value))} />
            </label>
            <label className="flex items-center gap-2 pb-3 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} /> Hiển thị
            </label>
          </div>
          <button disabled={busy} type="submit" className={button + " bg-orange-500 text-white hover:bg-orange-600"}><Plus className="h-4 w-4" />{editing ? "Lưu thay đổi" : "Thêm chương"}</button>
        </form>
        {message ? <p role="status" className="mt-4 rounded-xl bg-orange-50 p-3 text-sm font-semibold text-orange-800">{message}</p> : null}
      </section>
      <section className={inputBox}>
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black text-slate-950">Chương đã tạo ({visible.length})</h2>
          <button type="button" onClick={() => void load()} aria-label="Tải lại danh sách" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-5 w-5" /></button>
        </div>
        <p className="mt-2 text-sm text-slate-500">Đang xem: {grade} {subjectId ? "· " + (subjects.find((subject) => subject.id === subjectId)?.name ?? "") : "· tất cả môn"}</p>
        <div className="mt-5 max-h-[580px] space-y-3 overflow-y-auto">
          {visible.map((chapter) => (
            <article key={chapter.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-black text-slate-950">{chapter.title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{chapter.subject?.name} · {chapter._count?.lessons ?? 0} bài · {chapter.isPublished ? "Đang hiển thị" : "Bản nháp"}</p>
                </div>
                <div className="flex gap-1">
                  <button aria-label={"Sửa " + chapter.title} onClick={() => edit(chapter)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button>
                  <button aria-label={"Xóa " + chapter.title} disabled={busy || Boolean(chapter._count?.lessons)} onClick={() => void remove(chapter)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </article>
          ))}
          {!visible.length ? <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">Chưa có chương nào cho lựa chọn này.</p> : null}
        </div>
      </section>
    </div>
  );
}

export function TheoryLessonManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [grade, setGrade] = useState("Lớp 6");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [position, setPosition] = useState(1);
  const [accessLevel, setAccessLevel] = useState<"FREE" | "PRO">("FREE");
  const [isPublished, setIsPublished] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [subjects, chapters, lessons] = await Promise.all([
        getItems<Subject>("subjects"), getItems<Chapter>("theory-chapters"), getItems<Lesson>("theory-lessons"),
      ]);
      setSubjects(subjects); setChapters(chapters); setLessons(lessons);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không tải được dữ liệu."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visibleChapters = useMemo(() => chapters.filter((chapter) => chapter.grade === grade && chapter.subjectId === subjectId), [chapters, grade, subjectId]);
  const visibleLessons = useMemo(() => lessons.filter((lesson) => lesson.chapterId === chapterId), [lessons, chapterId]);

  function reset() {
    setEditing(null); setTitle(""); setSummary(""); setContent(""); setPosition(visibleLessons.length + 1);
    setAccessLevel("FREE"); setIsPublished(true); setFile(null); setRemoveFile(false); setFileInputKey((value) => value + 1);
  }
  function edit(lesson: Lesson) {
    const chapter = chapters.find((item) => item.id === lesson.chapterId);
    if (!chapter) return;
    setGrade(chapter.grade ?? "Lớp 6"); setSubjectId(chapter.subjectId); setChapterId(chapter.id);
    setEditing(lesson); setTitle(lesson.title); setSummary(lesson.summary ?? ""); setContent(lesson.content);
    setPosition(lesson.position); setAccessLevel(lesson.accessLevel); setIsPublished(lesson.isPublished);
    setRemoveFile(false); setFile(null); setFileInputKey((value) => value + 1); setMessage("Đang chỉnh sửa bài đã chọn.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chapterId) return setMessage("Hãy chọn lớp, môn học rồi chọn chương đã tạo.");
    if (!content.trim() && !file && (!editing?.fileOriginalName || removeFile)) return setMessage("Nhập nội dung hoặc chọn file PDF/Word.");
    if (file && file.size > 15 * 1024 * 1024) return setMessage("File không được vượt 15 MB.");
    setBusy(true); setMessage("Đang lưu bài lý thuyết...");
    try {
      const form = new FormData();
      const values = { chapterId, title, summary, content, position: String(position), accessLevel, isPublished: String(isPublished), removeFile: String(removeFile), lessonId: editing?.id ?? "" };
      for (const [key, value] of Object.entries(values)) form.set(key, value);
      if (file) form.set("file", file);
      const response = await fetch("/api/admin/theory-lessons/manage", { method: "POST", body: form });
      if (!response.ok) throw new Error(await apiMessage(response));
      await load(); reset(); setMessage(editing ? "Đã cập nhật bài." : "Đã thêm bài lý thuyết thành công.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được bài."); }
    finally { setBusy(false); }
  }

  async function remove(lesson: Lesson) {
    if (!window.confirm(`Xóa bài "${lesson.title}" và file đã tải lên (nếu có)?`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/theory-lessons/manage", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: lesson.id }) });
      if (!response.ok) throw new Error(await apiMessage(response));
      if (editing?.id === lesson.id) reset();
      await load(); setMessage("Đã xóa bài.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không xóa được bài."); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(310px,0.95fr)_minmax(330px,1.05fr)]">
      <section className={inputBox}>
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black text-slate-950">{editing ? "Chỉnh sửa bài" : "Thêm bài lý thuyết"}</h2>
          {editing ? <button onClick={reset} type="button" className="text-sm font-black text-orange-600">+ Thêm bài mới</button> : null}</div>
        <p className="mt-2 text-sm leading-6 text-slate-500">Chọn lớp và môn; chương được tải sẵn, không phải nhập lại. Có thể nhập nội dung trực tiếp, tải PDF/DOCX hoặc dùng cả hai.</p>
        <form onSubmit={save} className="mt-5 grid gap-4">
          <label className={label}>Lớp / kỳ thi
            <select className={field} value={grade} onChange={(event) => { setGrade(event.target.value); setChapterId(""); reset(); }}>
              {THEORY_GRADE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </label>
          <label className={label}>Môn học
            <select className={field} required value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setChapterId(""); reset(); }}>
              <option value="">Chọn môn</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label className={label}>Chương lý thuyết
            <select className={field} required value={chapterId} onChange={(event) => { setChapterId(event.target.value); reset(); }} disabled={!subjectId || !visibleChapters.length}>
              <option value="">{visibleChapters.length ? "Chọn chương đã tạo" : "Chưa có chương cho lớp/môn này"}</option>
              {visibleChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
            </select>
          </label>
          {!visibleChapters.length && subjectId ? <p className="text-sm font-bold text-orange-700">Chưa có chương. Hãy thêm trước tại mục Chương lý thuyết.</p> : null}
          <label className={label}>Tên bài
            <input className={field} required maxLength={250} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Bài 1. Tập hợp" />
          </label>
          <label className={label}>Tóm tắt (không bắt buộc)
            <textarea className={field} rows={2} value={summary} onChange={(event) => setSummary(event.target.value)} />
          </label>
          <label className={label}>Nội dung lý thuyết (có thể bỏ trống khi có PDF/Word)
            <textarea className={field} rows={7} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Nhập nội dung bài, xuống dòng để tách đoạn..." />
          </label>
          <label className={label}>Tải tệp bài lý thuyết (PDF hoặc Word .docx, tối đa 15 MB)
            <input key={fileInputKey} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="block w-full rounded-xl border border-dashed border-orange-200 bg-orange-50 px-3 py-3 text-xs font-semibold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:font-black file:text-white" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setRemoveFile(false); }} />
          </label>
          {editing?.fileOriginalName ? <div className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
            File hiện tại: {editing.fileOriginalName}
            <label className="mt-2 flex items-center gap-2 text-rose-600">
              <input type="checkbox" checked={removeFile} onChange={(event) => { setRemoveFile(event.target.checked); if (event.target.checked) { setFile(null); setFileInputKey((v) => v + 1); } }} /> Xóa file đính kèm
            </label>
          </div> : null}
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Thứ tự
              <input className={field} type="number" min={0} max={100000} value={position} onChange={(event) => setPosition(Number(event.target.value))} />
            </label>
            <label className={label}>Quyền xem
              <select className={field} value={accessLevel} onChange={(event) => setAccessLevel(event.target.value as "FREE" | "PRO")}>
                <option value="FREE">Miễn phí</option><option value="PRO">VIP</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} /> Hiển thị cho học viên</label>
          <button disabled={busy || !chapterId} type="submit" className={button + " bg-orange-500 text-white hover:bg-orange-600"}><FileText className="h-4 w-4" />{busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Đăng bài lý thuyết"}</button>
        </form>
        {message ? <p role="status" className="mt-4 rounded-xl bg-orange-50 p-3 text-sm font-semibold text-orange-800">{message}</p> : null}
      </section>
      <section className={inputBox}>
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black text-slate-950">Bài trong chương ({visibleLessons.length})</h2>
          <button type="button" onClick={() => void load()} aria-label="Tải lại danh sách" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 max-h-[680px] space-y-3 overflow-y-auto">
          {visibleLessons.map((lesson) => (
            <article key={lesson.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-slate-950">{lesson.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{lesson.fileOriginalName ? "Đính kèm: " + lesson.fileOriginalName : "Bài dạng văn bản"} · {lesson.accessLevel === "PRO" ? "VIP" : "Miễn phí"} · {lesson.isPublished ? "Hiển thị" : "Nháp"}</p>
                  <a href={"/theory/" + lesson.id} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-blue-600 underline">Xem bài</a>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button aria-label={"Sửa " + lesson.title} onClick={() => edit(lesson)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button>
                  <button aria-label={"Xóa " + lesson.title} disabled={busy} onClick={() => void remove(lesson)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </article>
          ))}
          {!visibleLessons.length ? <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">{chapterId ? "Chương này chưa có bài lý thuyết." : "Chọn lớp, môn và chương để xem các bài."}</p> : null}
        </div>
      </section>
    </div>
  );
}
