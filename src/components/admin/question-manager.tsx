"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

type Kind = "SINGLE_CHOICE" | "TRUE_FALSE_SET" | "SHORT_ANSWER" | "ESSAY";
type Option = { label: string; content: string; isCorrect: boolean };
type Exam = { id: string; title: string; isPublished: boolean; educationLevel: string | null; ownerId: string | null; _count: { questions: number } };
type Question = { id: string; examId: string; position: number; type: Kind; prompt: string; passage: string | null; points: number; correctText: string | null; explanation: string | null; answerOptions: Option[] };
type Draft = { position: number; type: Kind; prompt: string; passage: string; points: number; correctText: string; explanation: string; answerOptions: Option[] };
const kinds: Record<Kind, string> = { SINGLE_CHOICE: "Trắc nghiệm 1 đáp án", TRUE_FALSE_SET: "Đúng / Sai", SHORT_ANSWER: "Trả lời ngắn", ESSAY: "Tự luận" };
const input = "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-orange-400";
const label = "grid gap-1.5 text-sm font-bold text-slate-700";
function empty(position = 1): Draft {
  return { position, type: "SINGLE_CHOICE", prompt: "", passage: "", points: 1, correctText: "", explanation: "",
    answerOptions: ["A","B","C","D"].map((letter,i) => ({ label: letter, content: "", isCorrect: i===0 })) };
}
async function errorFrom(response: Response) {
  const data = await response.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : "Không thể xử lý yêu cầu.";
}
export function QuestionManager({ initialExamId = "" }: { initialExamId?: string }) {
  const [examText, setExamText] = useState("");
  const [examQuery, setExamQuery] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState(initialExamId);
  const [items, setItems] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Draft>(empty);
  const [editing, setEditing] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadExams = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ managed: "1", pageSize: "100" });
      if (examQuery) qs.set("q", examQuery);
      const response = await fetch("/api/admin/exams?" + qs, { cache: "no-store" });
      if (!response.ok) throw new Error(await errorFrom(response));
      const data = await response.json();
      let result: Exam[] = data.items ?? [];
      // A direct link from a specific exam must work even if it is older
      // than the 100 most recent records in the picker.
      if (initialExamId && !result.some((exam) => exam.id === initialExamId)) {
        const selectedResponse = await fetch("/api/admin/exams/" + encodeURIComponent(initialExamId), { cache: "no-store" });
        if (selectedResponse.ok) {
          const selectedData = await selectedResponse.json();
          if (selectedData.item) result = [selectedData.item as Exam, ...result];
        }
      }
      setExams(result);
    } catch (error) { setMessage(String(error)); }
  }, [examQuery, initialExamId]);
  useEffect(() => { void loadExams(); }, [loadExams]);

  const load = useCallback(async () => {
    if (!examId) { setItems([]); setTotal(0); return; }
    try {
      const qs = new URLSearchParams({ managed: "1", examId, page: String(page) });
      const response = await fetch("/api/admin/questions?" + qs, { cache: "no-store" });
      if (!response.ok) throw new Error(await errorFrom(response));
      const data = await response.json();
      setItems(data.items ?? []); setTotal(data.total ?? 0);
    } catch (error) { setMessage(String(error)); }
  }, [examId, page]);
  useEffect(() => { void load(); }, [load]);

  const selected = exams.find((exam) => exam.id === examId);
  const locked = Boolean(selected && !selected.ownerId && selected.educationLevel === "THPTQG" && selected.isPublished);
  function reset() { setEditing(null); setDraft(empty(total + 1)); }
  function edit(question: Question) {
    setEditing(question);
    setDraft({ position: question.position, type: question.type, prompt: question.prompt, passage: question.passage ?? "",
      points: question.points, correctText: question.correctText ?? "", explanation: question.explanation ?? "",
      answerOptions: question.answerOptions.map((option) => ({ ...option })) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function updateOption(index: number, changes: Partial<Option>) {
    setDraft((d) => ({ ...d, answerOptions: d.answerOptions.map((option, i) =>
      "isCorrect" in changes && d.type === "SINGLE_CHOICE"
        ? { ...option, isCorrect: index === i }
        : index === i ? { ...option, ...changes } : option) }));
  }
  function changeType(type: Kind) {
    setDraft((d) => ({ ...d, type, answerOptions: type === "SHORT_ANSWER" || type === "ESSAY" ? [] :
      d.answerOptions.length ? d.answerOptions : empty().answerOptions }));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!examId || locked) return setMessage("Hãy chọn đề hợp lệ. Đề THPTQG chính thức phải chuyển về bản nháp trước khi chỉnh.");
    if (!draft.prompt.trim() || !Number.isInteger(draft.position) || draft.position < 0 || !Number.isFinite(draft.points) || draft.points < 0) return setMessage("Kiểm tra nội dung, thứ tự và số điểm.");
    const choice = draft.type === "SINGLE_CHOICE" || draft.type === "TRUE_FALSE_SET";
    if (choice && (draft.answerOptions.length < 2 || draft.answerOptions.some((o) => !o.content.trim()) ||
       (draft.type === "SINGLE_CHOICE" && draft.answerOptions.filter((o) => o.isCorrect).length !== 1))) return setMessage("Điền đủ phương án và chọn đúng một đáp án cho câu trắc nghiệm.");
    if (draft.type === "SHORT_ANSWER" && !draft.correctText.trim()) return setMessage("Câu trả lời ngắn cần nhập đáp án.");
    const data = { examId, position: draft.position, type: draft.type, prompt: draft.prompt.trim(),
      passage: draft.passage.trim() || null, points: draft.points, correctText: choice ? null : draft.correctText.trim() || null,
      explanation: draft.explanation.trim() || null,
      answerOptions: choice ? draft.answerOptions.map((o) => ({ label: o.label, content: o.content.trim(), isCorrect: o.isCorrect })) : [] };
    setBusy(true); setMessage("Đang lưu...");
    try {
      const response = await fetch(editing ? "/api/admin/questions/" + encodeURIComponent(editing.id) : "/api/admin/questions", {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!response.ok) throw new Error(await errorFrom(response));
      setMessage(editing ? "Đã sửa câu hỏi." : "Đã thêm câu hỏi."); reset(); await load();
    } catch (error) { setMessage(String(error)); } finally { setBusy(false); }
  }
  async function remove(question: Question) {
    if (locked) return setMessage("Đề THPTQG chính thức phải chuyển về bản nháp trước khi xóa câu.");
    if (!window.confirm("Xóa vĩnh viễn câu " + question.position + "? Việc này có thể ảnh hưởng kết quả đã làm của học viên.")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/questions/" + encodeURIComponent(question.id), { method: "DELETE" });
      if (!response.ok) throw new Error(await errorFrom(response));
      if (editing?.id === question.id) reset();
      setMessage("Đã xóa câu hỏi."); await load();
    } catch (error) { setMessage(String(error)); } finally { setBusy(false); }
  }
  const totalPages = Math.max(1, Math.ceil(total / 30));
  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Chọn đề thi để xem và sửa câu hỏi</h2>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setExamQuery(examText.trim()); }}>
          <input aria-label="Tìm đề để sửa câu hỏi" className={input} placeholder="Nhập tên đề / mã đề..." value={examText} onChange={(e) => setExamText(e.target.value)} />
          <button type="submit" className="rounded-xl bg-slate-900 px-4 text-sm font-black text-white">Tìm đề</button>
        </form>
        <select aria-label="Chọn đề thi" className={input + " mt-3"} value={examId}
          onChange={(e) => { setExamId(e.target.value); setPage(1); setEditing(null); setDraft(empty()); setMessage(""); }}>
          <option value="">Chọn đề đã tải lên</option>
          {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title} ({exam._count.questions} câu)</option>)}
        </select>
        {exams.length === 100 ? <p className="mt-2 text-xs text-slate-500">Dùng ô tìm đề nếu không thấy trong 100 kết quả mới nhất.</p> : null}
        {locked ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Đề THPTQG chính thức đã xuất bản: vào Đề thi để ẩn đề trước khi sửa câu.</p> : null}
      </section>
      {examId ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(320px,.9fr)_minmax(360px,1.1fr)]">
          <section className="h-fit rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">{editing ? "Sửa câu hỏi" : "Thêm câu hỏi"}</h2>
              {editing ? <button type="button" onClick={reset} className="text-sm font-bold text-orange-600">Hủy sửa</button> : null}
            </div>
            <form onSubmit={save} className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className={label}>Câu số<input type="number" min={0} className={input} value={draft.position} onChange={(e) => setDraft((d) => ({ ...d, position: Number(e.target.value) }))} /></label>
                <label className={label}>Số điểm<input type="number" step="0.05" min={0} className={input} value={draft.points} onChange={(e) => setDraft((d) => ({ ...d, points: Number(e.target.value) }))} /></label>
              </div>
              <label className={label}>Dạng câu
                <select className={input} value={draft.type} onChange={(e) => changeType(e.target.value as Kind)}>
                  {Object.entries(kinds).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className={label}>Nội dung câu hỏi
                <textarea className={input} rows={5} maxLength={50000} required value={draft.prompt} onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))} />
              </label>
              <label className={label}>Đoạn văn / dữ kiện (tùy chọn)
                <textarea className={input} rows={2} value={draft.passage} onChange={(e) => setDraft((d) => ({ ...d, passage: e.target.value }))} />
              </label>
              {draft.type === "SINGLE_CHOICE" || draft.type === "TRUE_FALSE_SET" ? (
                <div className="space-y-2">
                  <p className="text-sm font-black text-slate-800">Các phương án và đáp án đúng</p>
                  {draft.answerOptions.map((o,i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 p-2">
                      <label className="mt-3 flex items-center gap-1 text-xs font-bold">
                        <input name="answer-correct" type={draft.type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                          checked={o.isCorrect} aria-label={"Đáp án " + o.label + " đúng"}
                          onChange={() => updateOption(i, { isCorrect: draft.type === "SINGLE_CHOICE" ? true : !o.isCorrect })} />
                        {o.label}
                      </label>
                      <textarea className={input} rows={2} maxLength={20000} value={o.content}
                        aria-label={"Nội dung đáp án " + o.label}
                        onChange={(e) => updateOption(i, { content: e.target.value })} />
                      <button type="button" aria-label={"Xóa phương án " + o.label} onClick={() => setDraft((d) => ({
                        ...d, answerOptions: d.answerOptions.filter((_,j) => j!==i).map((v,j) => ({ ...v, label: String.fromCharCode(65+j) }))
                      }))} className="mt-2 p-2 text-xs font-bold text-red-700">X</button>
                    </div>
                  ))}
                  <button type="button" disabled={draft.answerOptions.length >= 20} className="rounded-xl border border-orange-200 px-3 py-2 text-xs font-bold text-orange-700" onClick={() => setDraft((d) => ({
                    ...d, answerOptions: [...d.answerOptions, { label: String.fromCharCode(65+d.answerOptions.length), content: "", isCorrect: false }]
                  }))}>+ Thêm phương án</button>
                </div>
              ) : (
                <label className={label}>Đáp án {draft.type === "ESSAY" ? "mẫu (tùy chọn)" : "đúng"}
                  <textarea className={input} rows={3} required={draft.type === "SHORT_ANSWER"} value={draft.correctText} onChange={(e) => setDraft((d) => ({ ...d, correctText: e.target.value }))} />
                </label>
              )}
              <label className={label}>Giải thích / lời giải
                <textarea className={input} rows={3} value={draft.explanation} onChange={(e) => setDraft((d) => ({ ...d, explanation: e.target.value }))} />
              </label>
              <button type="submit" disabled={busy || locked} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-black text-white disabled:opacity-40"><Plus className="h-4 w-4" /> {editing ? "Lưu câu hỏi" : "Thêm câu hỏi"}</button>
            </form>
            {message ? <p role="status" className="mt-4 rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-900">{message}</p> : null}
          </section>
          <section className="min-w-0 rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Câu hỏi ({total})</h2>
              <button type="button" onClick={() => void load()} aria-label="Tải lại câu hỏi"><RefreshCw className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              {items.map((q) => <article key={q.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-orange-700">Câu {q.position} · {kinds[q.type]} · {q.points} điểm</p>
                <p className="mt-2 line-clamp-3 whitespace-pre-line break-words text-sm font-bold text-slate-900">{q.prompt}</p>
                {q.type === "SINGLE_CHOICE" ? <p className="mt-2 text-xs font-bold text-emerald-700">Đáp án: {q.answerOptions.filter((o) => o.isCorrect).map((o) => o.label).join(", ") || "Chưa có"}</p> : null}
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={busy || locked} onClick={() => edit(q)} className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-40"><Pencil className="h-4 w-4" /> Sửa</button>
                  <button type="button" disabled={busy || locked} onClick={() => void remove(q)} className="flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40"><Trash2 className="h-4 w-4" /> Xóa</button>
                </div>
              </article>)}
              {!items.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Đề chưa có câu hỏi.</p> : null}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 text-sm font-bold">
              <button type="button" disabled={page<=1} onClick={() => setPage((p) => p-1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trang trước</button>
              Trang {page}/{totalPages}
              <button type="button" disabled={page>=totalPages} onClick={() => setPage((p) => p+1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trang sau</button>
            </div>
          </section>
        </div>
      ) : <p className="rounded-2xl border border-dashed border-orange-200 bg-white p-6 text-sm font-semibold text-slate-600">Hãy chọn đề để quản lý câu hỏi, thay vì nhập ID hoặc JSON.</p>}
    </div>
  );
}
