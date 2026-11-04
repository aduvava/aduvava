"use client";
import { ChapterPicker } from "@/components/admin/chapter-picker";
import { useEffect, useState } from "react";
const grades = ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9", "Lớp 10", "Lớp 11", "Lớp 12", "Ôn thi vào 10", "Ôn thi THPTQG"];
const field = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500";
type Subject = { id: string; name: string; family: string };
export function TheoryUploadForm() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grade, setGrade] = useState(grades[0]);
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessLevel, setAccessLevel] = useState("FREE");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/admin/subjects").then((response) => response.json()).then((data) => setSubjects(data.items ?? [])).catch(() => setMessage("Không tải được môn học.")); }, []);
  const available = subjects.filter((item) => grade !== "Ôn thi THPTQG" || item.family === "THPTQG");
  const selected = available.some((item) => item.id === subjectId) ? subjectId : available[0]?.id ?? "";
  async function save() {
    if (!file || !title.trim() || !selected) { setMessage("Nhập tên lý thuyết, chọn môn và file."); return; }
    setBusy(true);
    const form = new FormData();
    Object.entries({ grade, chapterId, subjectId: selected, title, description, accessLevel }).forEach(([key, value]) => form.set(key, value)); form.set("file", file);
    try {
      const response = await fetch("/api/admin/theory-upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không lưu được tài liệu.");
      setMessage("Đã lưu chương lý thuyết và tài liệu. Xem trong mục Lý thuyết của môn học."); setTitle(""); setDescription(""); setFile(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không tải được tài liệu."); }
    finally { setBusy(false); }
  }
  return <section className="max-w-3xl rounded-3xl bg-white p-5 shadow-sm sm:p-7"><div className="grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-bold">Lớp / kì thi<select className={field} value={grade} onChange={(event) => setGrade(event.target.value)}>{grades.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="text-sm font-bold">Môn học<select className={field} value={selected} onChange={(event) => setSubjectId(event.target.value)}><option value="">Chọn môn học</option>{available.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <ChapterPicker subjectId={selected} grade={grade} value={chapterId} onChange={setChapterId} />
    <label className="text-sm font-bold sm:col-span-2">Tên lý thuyết<input className={field} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label className="text-sm font-bold sm:col-span-2">Mô tả<textarea className={field} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <label className="text-sm font-bold">Quyền truy cập<select className={field} value={accessLevel} onChange={(event) => setAccessLevel(event.target.value)}><option value="FREE">Miễn phí</option><option value="PRO">VIP</option></select></label>
    <label className="text-sm font-bold">File tài liệu<input className={field} type="file" accept=".pdf,.docx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><span className="mt-1 block font-normal text-slate-500">PDF hoặc Word (.docx), tối đa 15 MB</span></label>
  </div><button onClick={() => void save()} disabled={busy} className="mt-5 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Đang lưu..." : "Lưu tài liệu"}</button>{message && <p role="status" className="mt-4 text-sm font-semibold text-slate-600">{message}</p>}</section>;
}
