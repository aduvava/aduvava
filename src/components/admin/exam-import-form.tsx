"use client";

import { ExamClassification, type ClassifiedExam } from "@/components/admin/exam-classification";
import { ChapterPicker } from "@/components/admin/chapter-picker";
import { useEffect, useState } from "react";
import { parseDelimited, rowsToObjects } from "@/lib/spreadsheet-import";

type Subject = { id: string; name: string; family: "THPTQG" | "DGNL" };
type Imported = { prompt: string; options: string[]; correctIndex: number; explanation: string };
const grades = ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9", "Lớp 10", "Lớp 11", "Lớp 12", "Ôn thi vào 10", "Ôn thi THPTQG"];
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500";
function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function cell(row: Record<string, unknown>, aliases: string[]) {
  const entries = Object.entries(row);
  return String(entries.find(([key]) => aliases.some((alias) => normalize(key) === normalize(alias)))?.[1] ?? "").trim();
}

export function ExamImportForm() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<ClassifiedExam[]>([]);
  const [grade, setGrade] = useState(grades[0]);
  const [subjectId, setSubjectId] = useState("");
  const [contentMode, setContentMode] = useState("exams");
  const [chapterId, setChapterId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [accessLevel, setAccessLevel] = useState("FREE");
  const [questions, setQuestions] = useState<Imported[]>([]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const [subjectsResponse, examsResponse] = await Promise.all([fetch("/api/admin/subjects"), fetch("/api/admin/exams")]);
    if (subjectsResponse.ok) setSubjects((await subjectsResponse.json()).items ?? []);
    if (examsResponse.ok) setItems((await examsResponse.json()).items ?? []);
  }
  useEffect(() => { void refresh(); }, []);
  const available = subjects.filter((subject) => grade !== "Ôn thi THPTQG" || subject.family === "THPTQG");
  const selectedSubject = available.some((subject) => subject.id === subjectId) ? subjectId : available[0]?.id ?? "";

  async function importFile(file?: File) {
    setQuestions([]);
    setFileName("");
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Tệp tối đa 5 MB.");
      const name = file.name.toLowerCase();
      if (!/\.(xlsx|csv|tsv)$/.test(name)) throw new Error("Chọn tệp .xlsx, .csv hoặc .tsv.");
      const rows = name.endsWith(".xlsx")
        ? await (await import("read-excel-file/browser")).readSheet(file)
        : parseDelimited(await file.text(), name.endsWith(".tsv") ? "\t" : ",");
      const parsed = rowsToObjects(rows).filter((row) => Object.values(row).some((value) => String(value).trim())).map((row, index) => {
        const prompt = cell(row, ["question", "prompt", "câu hỏi", "nội dung câu hỏi"]);
        const options = ["A", "B", "C", "D", "E", "F"].map((letter) => cell(row, [letter, `option ${letter}`, `phương án ${letter}`])).filter(Boolean);
        const correct = cell(row, ["correct", "answer", "đáp án đúng", "đáp án"]);
        const match = correct.toUpperCase().match(/^[A-F]$/);
        const correctIndex = match ? match[0].charCodeAt(0) - 65 : options.findIndex((option) => normalize(option) === normalize(correct));
        if (!prompt || options.length < 2 || correctIndex < 0 || correctIndex >= options.length) throw new Error(`Dòng ${index + 2}: thiếu câu hỏi, phương án hoặc đáp án đúng.`);
        return { prompt, options, correctIndex, explanation: cell(row, ["explanation", "giải thích", "lời giải"]) };
      });
      if (!parsed.length) throw new Error("Tệp chưa có câu hỏi. Hàng đầu phải là question, A, B, C, D, correct, explanation.");
      setQuestions(parsed);
      setFileName(file.name);
      setMessage(`Đã đọc ${parsed.length} câu hỏi. Kiểm tra lớp, môn và thời gian trước khi lưu.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không đọc được tệp."); }
  }

  async function publish(item: { id: string; isPublished: boolean }) {
    const response = await fetch(`/api/admin/exams/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished: !item.isPublished }) });
    const data = await response.json();
    setMessage(response.ok ? (item.isPublished ? "Đã đưa đề về bản nháp." : "Đề đã xuất bản trên website.") : data.error ?? "Chưa thể xuất bản đề. Kiểm tra cấu trúc và đáp án.");
    if (response.ok) await refresh();
  }

  async function save() {
    if (!title.trim() || !selectedSubject || !questions.length) { setMessage("Nhập tên đề, chọn môn và tải file câu hỏi."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/import-exam", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grade, contentMode, chapterId: chapterId || null, subjectId: selectedSubject, title, description, durationMinutes: Number(durationMinutes), accessLevel, questions }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không lưu được đề thi.");
      setMessage(`Đã lưu ${questions.length} câu vào đề “${title}” ở trạng thái nháp. Kiểm tra trước khi xuất bản.`);
      setTitle(""); setDescription(""); setQuestions([]); setFileName("");
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được đề thi."); }
    finally { setBusy(false); }
  }
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]">
    <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-black">Thêm đề thi</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">Lớp / kì thi<select className={`${inputClass} mt-2`} value={grade} onChange={(event) => setGrade(event.target.value)}>{grades.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-sm font-bold">Môn học<select className={`${inputClass} mt-2`} value={selectedSubject} onChange={(event) => setSubjectId(event.target.value)}><option value="">Chọn môn học</option>{available.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-bold sm:col-span-2">Loại đề<select className={`${inputClass} mt-2`} value={contentMode} onChange={e => setContentMode(e.target.value)}><option value="exams">Theo kì thi</option><option value="topics">Theo chuyên đề</option></select></label>
        <ChapterPicker subjectId={selectedSubject} grade={grade} value={chapterId} onChange={setChapterId} />
        <label className="text-sm font-bold sm:col-span-2">Tên đề thi<input className={`${inputClass} mt-2`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Đề kiểm tra Toán lớp 6 số 01" /></label>
        <label className="text-sm font-bold sm:col-span-2">Mô tả / ghi chú<textarea className={`${inputClass} mt-2`} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label>
        <label className="text-sm font-bold">Thời gian làm bài (phút)<input className={`${inputClass} mt-2`} type="number" min={1} max={600} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} /></label>
        <label className="text-sm font-bold">Quyền truy cập<select className={`${inputClass} mt-2`} value={accessLevel} onChange={(event) => setAccessLevel(event.target.value)}><option value="FREE">Miễn phí</option><option value="PRO">VIP</option></select></label>
        <label className="text-sm font-bold sm:col-span-2">Nhập câu hỏi từ Excel / CSV / TSV<input className={`${inputClass} mt-2`} type="file" accept=".xlsx,.csv,.tsv" onChange={(event) => void importFile(event.target.files?.[0])} /><span className="mt-1 block font-normal text-slate-500">Hàng đầu: question, A, B, C, D, correct, explanation. Đáp án đúng ghi A/B/C/D hoặc nội dung phương án.</span></label>
      </div>
      {fileName && <p className="mt-4 text-sm">{fileName}: <strong>{questions.length} câu</strong> · {questions[0]?.prompt.slice(0, 100)}...</p>}
      <button disabled={busy || !questions.length} onClick={() => void save()} className="mt-5 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Đang lưu..." : "Lưu đề thi"}</button>
      {message && <p role="status" className="mt-4 text-sm font-semibold text-slate-600">{message}</p>}
    </section>
    <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black">Đề thi đã lưu</h2><p className="mt-2 text-sm text-slate-500">Đề mới luôn ở trạng thái nháp để kiểm tra đáp án. Đề THPTQG chính thức phải đủ cấu trúc trước khi xuất bản.</p><div className="mt-4 space-y-3">{items.filter((item) => item.ownerId === null).map((item) => <div key={item.id} className="rounded-xl border p-3 text-sm"><strong>{item.title}</strong><p className="text-slate-500">{item._count?.questions ?? 0} câu · {item.isPublished ? "Đã xuất bản" : "Bản nháp"}</p><button onClick={() => void publish(item)} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">{item.isPublished ? "Ẩn đề" : "Xuất bản"}</button><ExamClassification exam={item} onSaved={refresh} /></div>)}</div></section>
  </div>;
}
