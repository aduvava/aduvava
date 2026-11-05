"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, RefreshCw, Search, Trash2, UploadCloud, X } from "lucide-react";
import { importAdminExamFile, type ImportedExamQuestion } from "@/lib/admin-exam-file-import";

type Level = "THCS" | "THPT" | "EXAM_10" | "THPTQG" | null;
type Family = "THPTQG" | "DGNL";
type ExamType = "MOCK" | "PREDICTION" | "PRACTICE";
type Access = "FREE" | "PRO";
type Subject = { id: string; name: string; family: Family };
type Exam = {
  id: string; code: string; slug: string; title: string; description: string;
  family: Family; type: ExamType; accessLevel: Access; year: number;
  durationMinutes: number; educationLevel: Level; targetScore: number | null;
  subjectId: string; isPublished: boolean; ownerId: string | null;
  subject: Subject;
  _count: { questions: number; attempts: number };
};
type Draft = {
  title: string; description: string; code: string; slug: string;
  type: ExamType; accessLevel: Access; year: number; durationMinutes: number;
  educationLevel: Level; targetScore: string; subjectId: string; isPublished: boolean;
};

const newDraft = (): Draft => ({
  title: "", description: "", code: "", slug: "", type: "PRACTICE",
  accessLevel: "FREE", year: new Date().getFullYear(), durationMinutes: 45,
  educationLevel: "THCS", targetScore: "", subjectId: "", isPublished: false,
});
const field = "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const label = "grid gap-1.5 text-sm font-bold text-slate-700";
const levelName: Record<NonNullable<Level>, string> = {
  THCS: "Trung học cơ sở", THPT: "Trung học phổ thông",
  EXAM_10: "Ôn thi vào lớp 10", THPTQG: "Ôn thi THPTQG",
};
const slugify = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

async function apiMessage(response: Response) {
  const data = await response.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : "Không lưu được dữ liệu. Hãy thử lại.";
}

export function ExamManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<Exam[]>([]);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [fileQuestions, setFileQuestions] = useState<ImportedExamQuestion[] | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [parsingFile, setParsingFile] = useState(false);
  const pageSize = 30;

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ managed: "1", page: String(page), pageSize: String(pageSize) });
      if (query) params.set("q", query);
      if (level) params.set("level", level);
      if (subjectFilter) params.set("subjectId", subjectFilter);
      const response = await fetch("/api/admin/exams?" + params, { cache: "no-store" });
      if (!response.ok) throw new Error(await apiMessage(response));
      const data = await response.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải danh sách đề.");
    }
  }, [page, query, level, subjectFilter]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    async function getSubjects() {
      try {
        const response = await fetch("/api/admin/subjects", { cache: "no-store" });
        if (!response.ok) throw new Error(await apiMessage(response));
        const data = await response.json();
        setSubjects((data.items ?? []).map((s: Subject) => ({ id: s.id, name: s.name, family: s.family })));
      } catch (error) { setMessage(error instanceof Error ? error.message : "Không tải được danh sách môn."); }
    }
    void getSubjects();
  }, []);

  function setValue<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function reset() {
    setEditing(null);
    setDraft(newDraft());
    setFileQuestions(null);
    setSelectedFileName("");
  }
  async function uploadQuestions(file?: File) {
    if (!file) return;
    setFileQuestions(null);
    setSelectedFileName(file.name);
    setParsingFile(true);
    setMessage("Đang đọc file đề thi...");
    try {
      const parsed = await importAdminExamFile(file);
      setFileQuestions(parsed);
      setMessage(`Đã đọc ${parsed.length} câu hỏi. Kiểm tra lại thông tin rồi tạo đề.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không đọc được file. Hãy kiểm tra định dạng.");
    } finally {
      setParsingFile(false);
    }
  }
  function edit(exam: Exam) {
    setFileQuestions(null);
    setSelectedFileName("");
    setEditing(exam);
    setDraft({
      title: exam.title, description: exam.description, code: exam.code, slug: exam.slug,
      type: exam.type, accessLevel: exam.accessLevel, year: exam.year,
      durationMinutes: exam.durationMinutes, educationLevel: exam.educationLevel,
      targetScore: exam.targetScore === null ? "" : String(exam.targetScore),
      subjectId: exam.subjectId, isPublished: exam.isPublished,
    });
    setMessage("Đang chỉnh sửa: " + exam.title);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = subjects.find((item) => item.id === draft.subjectId);
    if (!subject) return setMessage("Vui lòng chọn môn học hợp lệ.");
    if (!draft.title.trim()) return setMessage("Vui lòng nhập tên đề thi.");
    if (!Number.isInteger(draft.year) || draft.year < 2000 || draft.year > 2200 ||
        !Number.isInteger(draft.durationMinutes) || draft.durationMinutes < 1 || draft.durationMinutes > 600) {
      return setMessage("Năm hoặc thời gian làm bài không hợp lệ.");
    }
    const score = draft.targetScore.trim() ? Number(draft.targetScore) : null;
    if (score !== null && (!Number.isFinite(score) || score < 0)) {
      return setMessage("Điểm mục tiêu phải là số không âm.");
    }
    const suffix = Date.now().toString(36);
    const data = {
      title: draft.title.trim(), description: draft.description.trim(),
      family: subject.family, type: draft.type, accessLevel: draft.accessLevel,
      year: draft.year, durationMinutes: draft.durationMinutes,
      educationLevel: draft.educationLevel, targetScore: score,
      subjectId: draft.subjectId, isPublished: draft.isPublished,
      code: editing ? draft.code.trim() : "ADMIN-" + suffix.toUpperCase(),
      slug: editing ? draft.slug.trim() : (slugify(draft.title) || "de-thi") + "-" + suffix,
    };
    if (!data.code || !data.slug) return setMessage("Mã đề và đường dẫn không được để trống.");
    setBusy(true); setMessage("Đang lưu đề thi...");
    try {
      const url = editing ? "/api/admin/exams/" + encodeURIComponent(editing.id)
        : fileQuestions ? "/api/admin/exams/import" : "/api/admin/exams";
      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileQuestions && !editing ? { metadata: data, questions: fileQuestions } : data),
      });
      if (!response.ok) throw new Error(await apiMessage(response));
      setMessage(editing ? "Đã lưu thay đổi đề thi."
        : fileQuestions ? `Đã tạo đề và nhập đủ ${fileQuestions.length} câu hỏi.`
        : "Đã tạo đề. Bạn có thể thêm câu hỏi trong mục Câu hỏi.");
      reset();
      setPage(1);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không lưu được đề thi.");
    } finally { setBusy(false); }
  }

  async function remove(exam: Exam) {
    const attempts = exam._count.attempts;
    const answer = window.prompt(
      "XÓA VĨNH VIỄN đề: " + exam.title + "\n" +
      "Sẽ xóa " + exam._count.questions + " câu hỏi" +
      (attempts ? " và " + attempts + " lượt làm cùng kết quả học viên." : ".") +
      "\nNhập chính xác TÊN ĐỀ để xác nhận:",
    );
    if (answer !== exam.title) {
      if (answer !== null) setMessage("Tên đề không khớp. Chưa xóa dữ liệu.");
      return;
    }
    if (attempts > 0 && !window.confirm("Đề đã có " + attempts + " lượt làm. Toàn bộ điểm và lịch sử của học viên sẽ mất vĩnh viễn. Bạn có chắc chắn muốn xóa?")) return;
    setBusy(true); setMessage("Đang xóa đề thi...");
    try {
      const url = "/api/admin/exams/" + encodeURIComponent(exam.id) +
        (attempts > 0 ? "?confirm=DELETE_WITH_RESULTS" : "");
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) throw new Error(await apiMessage(response));
      if (editing?.id === exam.id) reset();
      setMessage("Đã xóa vĩnh viễn đề " + exam.title + ".");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không xóa được đề.");
    } finally { setBusy(false); }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(320px,.86fr)_minmax(360px,1.14fr)]">
      <section className="h-fit rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">{editing ? "Chỉnh sửa đề thi" : "Tạo đề thi mới"}</h2>
            <p className="mt-1 text-sm text-slate-500">Chỉnh thông tin trực tiếp, không cần nhập JSON hoặc ID.</p>
          </div>
          {editing ? <button type="button" onClick={reset} className="flex items-center gap-1 text-xs font-black text-orange-600"><X className="h-4 w-4" /> Hủy sửa</button> : null}
        </div>
        <form className="mt-5 grid gap-4" onSubmit={submit}>
          <label className={label}>Tên đề thi
            <input className={field} required maxLength={250} value={draft.title} onChange={(e) => setValue("title", e.target.value)} placeholder="Ví dụ: Kiểm tra giữa kì 1 - Toán 9" />
          </label>
          <label className={label}>Mô tả đề thi
            <textarea rows={3} className={field} maxLength={20000} value={draft.description} onChange={(e) => setValue("description", e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>Cấp học / kỳ thi
              <select className={field} value={draft.educationLevel ?? ""} onChange={(e) => setValue("educationLevel", (e.target.value || null) as Level)}>
                <option value="">Không phân loại</option>
                {Object.entries(levelName).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
              </select>
            </label>
            <label className={label}>Môn học
              <select className={field} required value={draft.subjectId} onChange={(e) => setValue("subjectId", e.target.value)}>
                <option value="">Chọn môn học</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
            <label className={label}>Loại đề
              <select className={field} value={draft.type} onChange={(e) => setValue("type", e.target.value as ExamType)}>
                <option value="PRACTICE">Luyện tập</option>
                <option value="MOCK">Thi thử</option>
                <option value="PREDICTION">Đề dự đoán</option>
              </select>
            </label>
            <label className={label}>Quyền truy cập
              <select className={field} value={draft.accessLevel} onChange={(e) => setValue("accessLevel", e.target.value as Access)}>
                <option value="FREE">Miễn phí</option><option value="PRO">VIP</option>
              </select>
            </label>
            <label className={label}>Thời gian (phút)
              <input className={field} type="number" min={1} max={600} required value={draft.durationMinutes} onChange={(e) => setValue("durationMinutes", Number(e.target.value))} />
            </label>
            <label className={label}>Năm
              <input className={field} type="number" min={2000} max={2200} required value={draft.year} onChange={(e) => setValue("year", Number(e.target.value))} />
            </label>
            <label className={label}>Điểm mục tiêu (tùy chọn)
              <input className={field} type="number" min={0} step="0.1" value={draft.targetScore} onChange={(e) => setValue("targetScore", e.target.value)} placeholder="VD: 8" />
            </label>
          </div>
          {editing ? (
            <details className="rounded-xl border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-bold text-slate-600">Mã đề và đường dẫn (nâng cao)</summary>
              <p className="my-2 text-xs text-amber-700">Thay mã/đường dẫn có thể làm liên kết cũ không còn hoạt động.</p>
              <div className="grid gap-3">
                <label className={label}>Mã đề<input className={field} value={draft.code} maxLength={100} onChange={(e) => setValue("code", e.target.value)} /></label>
                <label className={label}>Đường dẫn (slug)<input className={field} value={draft.slug} maxLength={200} onChange={(e) => setValue("slug", e.target.value)} /></label>
              </div>
            </details>
          ) : null}
          {!editing ? (
            <div className="rounded-xl border border-dashed border-orange-300 bg-orange-50/40 p-4">
              <label htmlFor="admin-exam-upload" className="flex cursor-pointer items-center gap-2 text-sm font-black text-orange-700">
                <UploadCloud className="h-5 w-5" /> Tải file câu hỏi (không bắt buộc)
              </label>
              <input id="admin-exam-upload" type="file" accept=".txt,.csv,.tsv,.xlsx" className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:font-bold file:text-white" onChange={(event) => { void uploadQuestions(event.target.files?.[0]); event.target.value = ""; }} />
              <p className="mt-2 text-xs text-slate-500">Nhận TXT, CSV, TSV, Excel (XLSX), tối đa 5 MB. Mỗi câu cần 4 phương án A–D và cột/ dòng đáp án đúng. Không chọn file vẫn có thể tạo đề trống và thêm câu hỏi sau.</p>
              {selectedFileName ? <p className="mt-2 text-xs font-bold text-slate-700">{selectedFileName} · {parsingFile ? "Đang đọc..." : fileQuestions ? `${fileQuestions.length} câu hợp lệ` : "Chưa nhập thành công"}</p> : null}
              {fileQuestions?.length ? (
                <div className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-700">
                  <p className="font-black">Xem nhanh câu đầu: {fileQuestions[0].prompt}</p>
                  <p className="mt-1">Đáp án: {String.fromCharCode(65 + fileQuestions[0].correctIndex)}</p>
                  <button type="button" onClick={() => { setFileQuestions(null); setSelectedFileName(""); }} className="mt-2 font-bold text-red-600">Bỏ file đã chọn</button>
                </div>
              ) : null}
            </div>
          ) : null}
          <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" className="mt-1" checked={draft.isPublished} onChange={(e) => setValue("isPublished", e.target.checked)} />
            <span>Xuất bản cho học viên <span className="block text-xs font-normal text-slate-500">Tắt để ẩn đề. Đề THPTQG chính thức phải có đủ cấu trúc hợp lệ mới xuất bản được.</span></span>
          </label>
          <button type="submit" disabled={busy || parsingFile} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50">
            <Plus className="h-4 w-4" /> {busy ? "Đang xử lý..." : editing ? "Lưu thay đổi" : "Tạo đề thi"}
          </button>
        </form>
        {message ? <p role="status" className="mt-4 rounded-xl bg-orange-50 p-3 text-sm font-bold leading-6 text-orange-900">{message}</p> : null}
      </section>
      <section className="min-w-0 rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">Đề thi đã tải ({total})</h2>
          <button aria-label="Tải lại danh sách đề" type="button" onClick={() => void load()} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-5 w-5" /></button>
        </div>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()); }}>
          <input aria-label="Tìm tên hoặc mã đề" className={field} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên hoặc mã đề..." />
          <button type="submit" className="rounded-xl bg-slate-900 px-4 text-white" aria-label="Tìm đề"><Search className="h-4 w-4" /></button>
        </form>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={label}>Cấp học
            <select className={field} value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}>
              <option value="">Tất cả cấp học</option>
              {Object.entries(levelName).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
            </select>
          </label>
          <label className={label}>Môn học
            <select className={field} value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}>
              <option value="">Tất cả môn</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-5 space-y-3">
          {items.map((exam) => (
            <article key={exam.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words font-black text-slate-950">{exam.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{exam.subject?.name ?? "Chưa rõ môn"} · {exam.educationLevel ? levelName[exam.educationLevel] : "Chưa phân loại"} · {exam.durationMinutes} phút</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{exam._count.questions} câu · {exam._count.attempts} lượt làm · {exam.ownerId ? "Do người dùng tạo" : "Đề hệ thống"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={"rounded-full px-2.5 py-1 text-xs font-bold " + (exam.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{exam.isPublished ? "Đang hiển thị" : "Đã ẩn"}</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{exam.accessLevel === "PRO" ? "VIP" : "Miễn phí"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => edit(exam)} disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700 shadow-sm hover:bg-blue-50"><Pencil className="h-4 w-4" /> Sửa</button>
                  <button type="button" onClick={() => void remove(exam)} disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"><Trash2 className="h-4 w-4" /> Xóa</button>
                </div>
              </div>
            </article>
          ))}
          {!items.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Chưa tìm thấy đề thi.</p> : null}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-40">Trang trước</button>
          <span className="text-sm font-bold text-slate-600">Trang {page}/{pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-40">Trang sau</button>
        </div>
      </section>
    </div>
  );
}
