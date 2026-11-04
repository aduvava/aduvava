"use client";
import { useEffect, useState } from "react";
import { ChapterPicker } from "@/components/admin/chapter-picker";
import { learningGrades } from "@/lib/learning-context";
export function SubjectChapters() {
 const [message, setMessage] = useState("");
 const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
 const [subjectId, setSubjectId] = useState(""); const [grade, setGrade] = useState<string>(learningGrades[0]); const [chapterId, setChapterId] = useState("");
 useEffect(() => { fetch("/api/admin/subjects").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => setSubjects(d.items ?? [])).catch(() => setMessage("Không tải được môn học. Tải lại trang để thử lại.")); }, []);
 const selected = subjectId || subjects[0]?.id || "";
 return <section className="grid max-w-3xl gap-4 rounded-3xl bg-white p-6 sm:grid-cols-2"><label className="text-sm font-bold">Lớp<select className="mt-2 w-full rounded-xl border p-3" value={grade} onChange={e => setGrade(e.target.value)}>{learningGrades.map(g => <option key={g}>{g}</option>)}</select></label><label className="text-sm font-bold">Môn học<select className="mt-2 w-full rounded-xl border p-3" value={selected} onChange={e => setSubjectId(e.target.value)}>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>{message && <p role="status" className="sm:col-span-2 text-sm text-red-600">{message}</p>}<ChapterPicker subjectId={selected} grade={grade} value={chapterId} onChange={setChapterId} /></section>;
}
