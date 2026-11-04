"use client";
import { useState } from "react";
import { learningContext, learningGrades } from "@/lib/learning-context";
import { ChapterPicker } from "@/components/admin/chapter-picker";
export type ClassifiedExam = { id: string; title: string; isPublished: boolean; ownerId?: string | null; subjectId: string; grade: string | null; educationLevel: string | null; contentMode: string; chapterId: string | null; _count?: { questions: number } };
export function ExamClassification({ exam, onSaved }: { exam: ClassifiedExam; onSaved: () => Promise<void> }) {
 const [open, setOpen] = useState(false); const [mode, setMode] = useState(exam.contentMode); const [chapterId, setChapterId] = useState(exam.chapterId ?? ""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
 const [grade, setGrade] = useState(exam.educationLevel === "THPTQG" ? "Ôn thi THPTQG" : exam.educationLevel === "EXAM_10" ? "Ôn thi vào 10" : exam.grade ?? "");
 async function save() {
   setBusy(true);
   try { const response = await fetch(`/api/admin/exams/${exam.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentMode: mode, chapterId: chapterId || null, ...(grade ? learningContext(grade) : { grade: null, educationLevel: null }) }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Không lưu được phân loại."); await onSaved(); setOpen(false); setMessage("Đã lưu phân loại."); }
   catch (e) { setMessage(e instanceof Error ? e.message : "Không lưu được."); } finally { setBusy(false); }
 }
 return <div className="mt-3"><p className="text-xs text-slate-500">{exam.contentMode === "topics" ? "Theo chuyên đề" : "Theo kì thi"} · {grade || "Chưa chọn lớp"}</p><button type="button" onClick={() => setOpen(!open)} className="mt-2 font-bold text-orange-600">Sửa phân loại / chương</button>{open && <div className="mt-3 space-y-3"><label className="block">Lớp<select className="ml-2 rounded border p-2" value={grade} onChange={e => { setGrade(e.target.value); setChapterId(""); }}><option value="">Tất cả lớp</option>{learningGrades.map(g => <option key={g}>{g}</option>)}</select></label><label>Loại đề<select className="ml-2 rounded border p-2" value={mode} onChange={e => setMode(e.target.value)}><option value="exams">Theo kì thi</option><option value="topics">Theo chuyên đề</option></select></label>{grade ? <ChapterPicker subjectId={exam.subjectId} grade={grade} value={chapterId} onChange={setChapterId} /> : <p>Chọn lớp để đưa đề vào một chương cụ thể.</p>}<button type="button" disabled={busy} onClick={() => void save()} className="rounded bg-orange-500 px-3 py-2 font-bold text-white">{busy ? "Đang lưu..." : "Lưu phân loại"}</button></div>}{message && <p role="status" className="mt-2 text-xs">{message}</p>}</div>;
}
