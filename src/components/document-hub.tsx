"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  Search,
  Star,
  UploadCloud,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { documentCatalog, documentTypes, type DocumentLevel, type DocumentTypeId } from "@/lib/document-catalog";

type DocumentItem = {
  id: string;
  title: string;
  description: string;
  level: DocumentLevel;
  grade: string;
  subject: string;
  type: DocumentTypeId;
  originalName: string;
  mimeType: string;
  fileSize: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  downloads: number;
  uploader: { id: string; name?: string | null };
  ratingCount: number;
  averageRating: number;
  myRating: number;
  createdAt: string;
};

const statusLabels = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Cần chỉnh sửa",
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentHub() {
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState(searchParams.get("mine") === "1");
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<DocumentLevel>("THCS");
  const currentLevel = useMemo(() => documentCatalog.find((item) => item.id === level) ?? documentCatalog[0], [level]);
  const [grade, setGrade] = useState<string>(documentCatalog[0].grades[0]);
  const [subject, setSubject] = useState<string>("");
  const [type, setType] = useState<DocumentTypeId | "">("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<DocumentItem | null>(null);
  const [reporting, setReporting] = useState<DocumentItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (mine) params.set("mine", "1");
    else {
      params.set("level", level);
      params.set("grade", grade);
      if (subject) params.set("subject", subject);
      if (type) params.set("type", type);
      if (q.trim()) params.set("q", q.trim());
    }
    const response = await fetch(`/api/documents?${params}`);
    const data = await response.json();
    setDocuments(data.documents ?? []);
    setLoading(false);
  }, [grade, level, mine, q, subject, type]);

  useEffect(() => {
    const timeout = setTimeout(loadDocuments, 200);
    return () => clearTimeout(timeout);
  }, [loadDocuments]);

  function selectLevel(nextLevel: DocumentLevel) {
    const next = documentCatalog.find((item) => item.id === nextLevel) ?? documentCatalog[0];
    setLevel(nextLevel);
    setGrade(next.grades[0]);
    setSubject("");
  }

  async function rate(documentId: string, rating: number) {
    const response = await fetch(`/api/documents/${documentId}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Đã ghi nhận đánh giá của bạn." : data.error ?? "Không thể đánh giá.");
    if (response.ok) loadDocuments();
  }

  return (
    <div className="min-h-screen bg-[#fffdf3] pb-20">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">Kho học liệu cộng đồng</span>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">Tài liệu học tập</h1>
            <p className="mt-3 flex max-w-2xl items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Tài liệu này chỉ sưu tầm, không chịu trách nhiệm về bản quyền.
            </p>
          </div>
          <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-orange-200">
            <UploadCloud className="h-4 w-4" /> Tải tài liệu lên
          </button>
        </div>

        <div className="mt-7 flex w-fit gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
          <button type="button" onClick={() => setMine(false)} className={clsx("rounded-xl px-4 py-2 text-xs font-extrabold transition", !mine ? "bg-orange-500 text-white" : "text-slate-500 hover:bg-orange-50")}>Kho tài liệu</button>
          <button type="button" onClick={() => setMine(true)} className={clsx("rounded-xl px-4 py-2 text-xs font-extrabold transition", mine ? "bg-orange-500 text-white" : "text-slate-500 hover:bg-orange-50")}>Tài liệu của tôi</button>
        </div>

        {!mine ? (
          <section className="mt-5 rounded-[1.5rem] border border-orange-100 bg-white p-4 shadow-sm">
            <div className="flex justify-start gap-2 overflow-x-auto pb-2">
              {documentCatalog.map((item) => (
                <button key={item.id} type="button" onClick={() => selectLevel(item.id)} className={clsx("shrink-0 rounded-full px-4 py-2 text-xs font-bold transition", level === item.id ? "bg-orange-500 text-white shadow-md shadow-orange-200" : "bg-slate-50 text-slate-600")}>{item.label}</button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap justify-start gap-2 border-t border-slate-100 pt-3">
              {currentLevel.grades.map((item) => (
                <button key={item} type="button" onClick={() => setGrade(item)} className={clsx("rounded-full border px-3.5 py-1.5 text-xs font-bold transition", grade === item ? "border-blue-500 bg-blue-500 text-white" : "border-slate-200 text-slate-600")}>{item}</button>
              ))}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_250px]">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Tìm theo tiêu đề hoặc mô tả..." className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </label>
              <select value={subject} onChange={(event) => setSubject(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none">
                <option value="">Tất cả môn học</option>
                {currentLevel.subjects.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={type} onChange={(event) => setType(event.target.value as DocumentTypeId | "")} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none">
                <option value="">Tất cả loại tài liệu</option>
                {documentTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
          </section>
        ) : null}

        {message ? <div className="mt-5 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</div> : null}

        <div className="mt-6 grid justify-items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <article key={document.id} className="flex w-full max-w-[320px] flex-col rounded-[1.5rem] border border-orange-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-500"><FileText className="h-6 w-6" /></span>
                {mine ? <span className={clsx("rounded-full px-3 py-1 text-[11px] font-extrabold", document.status === "APPROVED" ? "bg-emerald-50 text-emerald-600" : document.status === "REJECTED" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>{statusLabels[document.status]}</span> : null}
              </div>
              <h2 className="mt-4 line-clamp-2 text-base font-black text-slate-800">{document.title}</h2>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">{document.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{document.grade}</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-600">{document.subject}</span>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-600">{documentTypes.find((item) => item.id === document.type)?.label}</span>
              </div>
              {document.rejectionReason ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-600">{document.rejectionReason}</p> : null}
              <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
                <span>{formatBytes(document.fileSize)} · {document.downloads} lượt tải</span>
                <span>{document.uploader.name ?? "Thành viên"}</span>
              </div>
              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" disabled={mine || document.status !== "APPROVED"} onClick={() => rate(document.id, star)} aria-label={`${star} sao`} className="disabled:cursor-default">
                    <Star className={clsx("h-4 w-4", star <= (document.myRating || Math.round(document.averageRating)) ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                  </button>
                ))}
                <span className="ml-1 text-xs text-slate-400">{document.averageRating.toFixed(1)} ({document.ratingCount})</span>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <button type="button" onClick={() => setPreview(document)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 px-3 py-2.5 text-xs font-extrabold text-blue-600"><Eye className="h-4 w-4" /> Xem trước</button>
                {document.status === "APPROVED" ? <a href={`/api/documents/${document.id}/file?download=1`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2.5 text-xs font-extrabold text-white"><Download className="h-4 w-4" /> Tải tài liệu</a> : null}
                {!mine && document.status === "APPROVED" ? <button type="button" onClick={() => setReporting(document)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-400 hover:text-red-500" aria-label="Báo cáo"><AlertTriangle className="h-4 w-4" /></button> : null}
              </div>
            </article>
          ))}
        </div>

        {loading ? <div className="grid min-h-52 place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-orange-500" /></div> : null}
        {!loading && !documents.length ? <div className="mt-8 rounded-[2rem] border-2 border-dashed border-orange-200 bg-white/60 p-12 text-center"><BookOpen className="mx-auto h-10 w-10 text-orange-300" /><h2 className="mt-4 text-xl font-black text-slate-700">Chưa có tài liệu phù hợp</h2><p className="mt-2 text-sm text-slate-500">Hãy đổi bộ lọc hoặc chia sẻ tài liệu đầu tiên cho cộng đồng.</p></div> : null}
      </div>

      {uploadOpen ? <UploadDocumentModal onClose={() => setUploadOpen(false)} onUploaded={() => { setUploadOpen(false); setMine(true); loadDocuments(); setMessage("Tài liệu đã được gửi và đang chờ Admin duyệt."); }} /> : null}
      {preview ? <PreviewModal document={preview} onClose={() => setPreview(null)} /> : null}
      {reporting ? <ReportModal document={reporting} onClose={() => setReporting(null)} onDone={(text) => { setReporting(null); setMessage(text); }} /> : null}
    </div>
  );
}

function UploadDocumentModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [level, setLevel] = useState<DocumentLevel>("THCS");
  const currentLevel = documentCatalog.find((item) => item.id === level) ?? documentCatalog[0];
  const [grade, setGrade] = useState<string>(currentLevel.grades[0]);
  const [subject, setSubject] = useState<string>(currentLevel.subjects[0]);
  const [type, setType] = useState<DocumentTypeId>("THEORY_SUMMARY");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function changeLevel(next: DocumentLevel) {
    const catalog = documentCatalog.find((item) => item.id === next) ?? documentCatalog[0];
    setLevel(next);
    setGrade(catalog.grades[0]);
    setSubject(catalog.subjects[0]);
  }

  async function submit(formData: FormData) {
    setSaving(true);
    setMessage(null);
    formData.set("level", level);
    formData.set("grade", grade);
    formData.set("subject", subject);
    formData.set("type", type);
    const response = await fetch("/api/documents", { method: "POST", body: formData });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(data.error ?? "Không thể tải tài liệu lên.");
    onUploaded();
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-500">Nhận +50 xu khi được duyệt</p><h2 className="mt-1 text-2xl font-black text-slate-900">Tải tài liệu lên</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"><X className="h-5 w-5" /></button></div>
        <form action={submit} className="mt-6 grid gap-4">
          <input name="title" required minLength={5} placeholder="Tiêu đề tài liệu" className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" />
          <textarea name="description" required minLength={10} placeholder="Mô tả ngắn gọn nội dung tài liệu..." className="min-h-28 rounded-2xl border border-slate-200 p-4 outline-none focus:border-orange-400" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={level} onChange={(event) => changeLevel(event.target.value as DocumentLevel)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">{documentCatalog.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
            <select value={grade} onChange={(event) => setGrade(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">{currentLevel.grades.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={subject} onChange={(event) => setSubject(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">{currentLevel.subjects.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={type} onChange={(event) => setType(event.target.value as DocumentTypeId)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">{documentTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          </div>
          <label className="rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/40 p-6 text-center">
            <UploadCloud className="mx-auto h-9 w-9 text-orange-500" />
            <span className="mt-2 block text-sm font-extrabold text-slate-700">Chọn PDF, DOCX hoặc PPTX</span>
            <span className="mt-1 block text-xs text-slate-400">Dung lượng tối đa 15MB</span>
            <input name="file" type="file" required accept=".pdf,.docx,.pptx" className="mt-4 block w-full text-xs" />
          </label>
          {message ? <p className="text-sm font-semibold text-red-500">{message}</p> : null}
          <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 font-extrabold text-white disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}{saving ? "Đang tải..." : "Gửi tài liệu chờ duyệt"}</button>
        </form>
      </div>
    </div>
  );
}

function PreviewModal({ document, onClose }: { document: DocumentItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="min-w-0"><h2 className="truncate font-black text-slate-800">{document.title}</h2><p className="text-xs text-slate-400">{document.originalName}</p></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"><X className="h-5 w-5" /></button></div>
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs font-bold text-amber-800">
          Tài liệu này chỉ sưu tầm, không chịu trách nhiệm về bản quyền.
        </div>
        <iframe title={`Xem trước ${document.title}`} src={`/api/documents/${document.id}/preview`} sandbox="allow-same-origin" className="min-h-0 flex-1 bg-slate-50" />
        {document.status === "APPROVED" ? <div className="border-t border-slate-100 p-3 text-right"><a href={`/api/documents/${document.id}/file?download=1`} className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-extrabold text-white"><Download className="h-4 w-4" /> Tải tài liệu</a></div> : null}
      </div>
    </div>
  );
}

function ReportModal({ document, onClose, onDone }: { document: DocumentItem; onClose: () => void; onDone: (message: string) => void }) {
  const [reason, setReason] = useState("FILE_ERROR");
  const [details, setDetails] = useState("");

  async function submit() {
    const response = await fetch(`/api/documents/${document.id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, details }) });
    const data = await response.json();
    onDone(response.ok ? data.message : data.error ?? "Không thể gửi báo cáo.");
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-xl font-black text-slate-900">Báo cáo tài liệu</h2><button type="button" onClick={onClose}><X className="h-5 w-5" /></button></div>
        <p className="mt-2 line-clamp-2 text-sm text-slate-500">{document.title}</p>
        <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"><option value="FILE_ERROR">File lỗi hoặc không mở được</option><option value="WRONG_CONTENT">Sai kiến thức</option><option value="SPAM">Spam / nội dung rác</option><option value="COPYRIGHT">Vi phạm bản quyền</option></select>
        <textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Mô tả thêm (không bắt buộc)" className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 p-4" />
        <button type="button" onClick={submit} className="mt-4 w-full rounded-full bg-red-500 px-5 py-3 font-extrabold text-white">Gửi báo cáo</button>
      </div>
    </div>
  );
}
