"use client";
import { useEffect, useState } from "react";
import { chapterMatches } from "@/lib/learning-context";
type Chapter = { id: string; title: string; subjectId: string; educationLevel: string | null; grade: string | null };
export function ChapterPicker({ subjectId, grade, value, onChange }: { subjectId: string; grade: string; value: string; onChange: (id: string) => void }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [position, setPosition] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { let active = true; fetch("/api/admin/theory-chapters").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => { if (active) { setChapters(data.items ?? []); setLoaded(true); } }).catch(() => { if (active) setMessage("Không tải được danh sách chương."); }); return () => { active = false; }; }, []);
  const available = chapters.filter(c => chapterMatches(c, subjectId, grade));
  const selected = !loaded ? value : available.some(c => c.id === value) ? value : "";
  useEffect(() => { if (loaded && value && !selected) onChange(""); }, [loaded, value, selected, onChange]);
  async function create() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/chapters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subjectId, grade, title, position }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không thêm được chương.");
      setChapters(items => [...items, data.item]); onChange(data.item.id); setOpen(false); setTitle(""); setMessage("Đã nhập chương vào môn học.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thêm được chương."); }
    finally { setBusy(false); }
  }
  const field = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm";
  return <div className="sm:col-span-2"><div className="flex items-end gap-3"><label className="flex-1 text-sm font-bold">Chương / chuyên đề<select className={field} value={selected} onChange={e => onChange(e.target.value)}><option value="">Chưa phân chương</option>{available.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><button type="button" disabled={!subjectId} onClick={() => setOpen(!open)} className="rounded-xl bg-orange-100 px-4 py-3 text-sm font-bold text-orange-700">+ Nhập chương</button></div>
  {open && <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-4"><label className="text-sm font-bold">Tên chương<input className={field} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Chương 1 — Hàm số" /></label><label className="mt-3 block text-sm font-bold">Thứ tự<input className={field} type="number" min={0} value={position} onChange={e => setPosition(Number(e.target.value))} /></label><button type="button" disabled={busy || !title.trim()} onClick={() => void create()} className="mt-3 rounded-lg bg-orange-500 px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? "Đang lưu..." : "Lưu chương"}</button></div>}
  {message && <p role="status" className="mt-2 text-sm text-slate-600">{message}</p>}</div>;
}
