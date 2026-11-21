"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAssessmentRule, getAssessmentVariant, flattenAssessmentBlocks, assessmentQuestionCount } from "@/lib/special-exam-rules";
import { parseDelimited, rowsToObjects } from "@/lib/spreadsheet-import";
import { extractXlsxEmbeddedImages } from "@/lib/office-image-import";
import { isSafeRichImageUrl } from "@/lib/rich-image-security";

type Track = "HSA" | "TSA" | "V_ACT" | "QDA" | "DGNL_BCA";
type ImportQuestion = {
  type: "SINGLE_CHOICE" | "TRUE_FALSE_SET" | "SHORT_ANSWER" | "ESSAY";
  blockKey: string;
  prompt: string;
  options?: string[];
  correct?: "A" | "B" | "C" | "D";
  correctText?: string;
  statements?: { content: string; isCorrect: boolean }[];
  passage?: string;
  explanation?: string;
};
type Subject = { id: string; name: string };

const classes = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900";
const fieldName = (name: string) => name.toLocaleLowerCase("vi").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
function readField(row: Record<string, unknown>, aliases: string[]) {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const pair = entries.find(([key]) => fieldName(key) === fieldName(alias));
    if (pair && pair[1] !== null && pair[1] !== undefined && String(pair[1]).trim()) return String(pair[1]).trim();
  }
  return "";
}
function templateQuestions(track: Track, variantId: string): ImportQuestion[] {
  const variant = getAssessmentVariant(track, variantId);
  if (!variant) return [];
  return flattenAssessmentBlocks(variant).flatMap((block) =>
    Array.from({ length: block.count }, (_, index) => {
      const type = block.requiredShortAnswers && index >= block.count - block.requiredShortAnswers
        ? "SHORT_ANSWER" : block.questionType;
      const prompt = "Câu " + (block.start + index) + ": [Nhập nội dung " + block.label + "]";
      if (type === "ESSAY") return { blockKey: block.key, type, prompt: "Viết bài nghị luận xã hội: [Nhập đề bài]" };
      if (type === "SHORT_ANSWER") return { blockKey: block.key, type, prompt, correctText: "[Nhập đáp án]" };
      if (type === "TRUE_FALSE_SET") return {
        blockKey: block.key, type, prompt,
        statements: ["Nhận định A", "Nhận định B", "Nhận định C", "Nhận định D"].map((content, i) =>
          ({ content, isCorrect: i % 2 === 0 })),
      };
      return { blockKey: block.key, type: "SINGLE_CHOICE", prompt,
        options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"], correct: "A" };
    }),
  );
}

export function SpecialExamImport() {
  const [track, setTrack] = useState<Track>("HSA");
  const [variantId, setVariantId] = useState("EN");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [accessLevel, setAccessLevel] = useState<"FREE" | "PRO">("FREE");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [questions, setQuestions] = useState<ImportQuestion[]>([]);
  const [importName, setImportName] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [warningsConfirmed, setWarningsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState<{ id: string; slug: string } | null>(null);
  const rule = getAssessmentRule(track);
  const variants = rule?.variants ?? [];
  const selected = getAssessmentVariant(track, variantId);
  const blocks = useMemo(() => selected ? flattenAssessmentBlocks(selected) : [], [selected]);
  const expectedCount = selected ? assessmentQuestionCount(selected) : 0;
  const ready = questions.length === expectedCount && Boolean(subjectId) && Boolean(title.trim()) && !busy
    && (!warnings.length || warningsConfirmed);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/subjects", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("Không tải được môn học.");
      return response.json();
    }).then((result) => {
      if (!active) return;
      const data: Subject[] = (result.items ?? []).map((item: Subject) => ({ id: item.id, name: item.name }));
      setSubjects(data);
      setSubjectId((old) => old || data[0]?.id || "");
    }).catch(() => { if (active) setMessage("Không tải được danh sách môn học. Vui lòng đăng nhập Admin."); });
    return () => { active = false; };
  }, []);

  function switchTrack(next: Track) {
    setTrack(next);
    setVariantId(getAssessmentRule(next)?.variants[0]?.id ?? "");
    clearQuestions();
  }
  function switchVariant(next: string) {
    setVariantId(next);
    clearQuestions();
  }
  function clearQuestions() {
    setQuestions([]);
    setWarnings([]);
    setWarningsConfirmed(false);
    setImportName("");
    setCreated(null);
  }
  function downloadTemplate() {
    const payload = { track, variant: selected?.id, questions: templateQuestions(track, variantId) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "mau-dgnl-" + track.toLowerCase().replaceAll("_", "-") + "-" + variantId.toLowerCase() + ".json";
    link.click();
    URL.revokeObjectURL(url);
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("Đang kiểm tra nội dung tệp...");
    clearQuestions();
    setImportName(file.name);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("File vượt 8 MB. Hãy chia nhỏ hình minh họa.");
      let imported: ImportQuestion[] = [];
      let notes: string[] = [];
      if (file.name.toLowerCase().endsWith(".json")) {
        const json: unknown = JSON.parse(await file.text());
        const root = json && typeof json === "object" && !Array.isArray(json) ? json as Record<string, unknown> : null;
        const items = Array.isArray(json) ? json : root?.questions;
        if (root?.track && root.track !== track) throw new Error("File thuộc kỳ thi " + root.track + ", đang chọn " + track + ".");
        if (root?.variant && root.variant !== variantId) throw new Error("File thuộc tổ hợp " + root.variant + ", đang chọn " + variantId + ".");
        if (!Array.isArray(items)) throw new Error("JSON phải có mảng questions.");
        imported = items as ImportQuestion[];
      } else if (/\.(xlsx|csv|tsv)$/i.test(file.name)) {
        let rows: readonly (readonly unknown[])[] = [];
        let embedded = new Map<number, string[]>();
        if (file.name.toLowerCase().endsWith(".xlsx")) {
          const { default: readWorkbook } = await import("read-excel-file/browser");
          const sheets = await readWorkbook(file);
          const selectedSheet = sheets.find((sheet) => fieldName(sheet.sheet) === "cauhoi") ?? sheets[0];
          if (!selectedSheet) throw new Error("File không có sheet Excel.");
          rows = selectedSheet.data;
          const imageResult = await extractXlsxEmbeddedImages(file, selectedSheet.sheet);
          embedded = imageResult.byRow;
          notes = imageResult.warnings;
        } else {
          rows = parseDelimited(await file.text(), file.name.toLowerCase().endsWith(".tsv") ? "\t" : ",");
        }
        imported = rowsToObjects(rows).map((row, index) => {
          const block = blocks.find((item) => index + 1 >= item.start && index + 1 <= item.end);
          if (!block) throw new Error("File có nhiều câu hơn cấu trúc " + track + ".");
          const type = (readField(row, ["type", "dạng câu"]) ||
            (block.requiredShortAnswers && index + 1 > block.end - block.requiredShortAnswers
              ? "SHORT_ANSWER" : block.questionType)).toUpperCase() as ImportQuestion["type"];
          const rawPrompt = readField(row, ["question", "prompt", "câu hỏi"]);
          const extra = embedded.get(index + 2) ?? [];
          const imageLink = readField(row, ["image", "ảnh", "hình ảnh", "image url"]);
          if (imageLink) {
            if (isSafeRichImageUrl(imageLink)) extra.push(imageLink);
            else notes.push("Dòng " + (index + 2) + ": URL ảnh ngoài không được chèn để tránh mất ảnh hoặc theo dõi người học.");
          }
          const prompt = rawPrompt + extra.map((image) => "\n![Hình minh họa](" + image + ")").join("");
          const passage = readField(row, ["passage", "ngữ liệu", "bài đọc"]);
          const explanation = readField(row, ["explanation", "giải thích", "lời giải"]);
          const question: ImportQuestion = { type, blockKey: block.key, prompt, ...(passage ? { passage } : {}),
            ...(explanation ? { explanation } : {}) };
          if (type === "SINGLE_CHOICE") {
            question.options = ["A", "B", "C", "D"].map((letter) => readField(row, [letter, "option " + letter]));
            question.correct = readField(row, ["correct", "answer", "đáp án đúng"]).toUpperCase() as ImportQuestion["correct"];
          } else if (type === "SHORT_ANSWER") {
            question.correctText = readField(row, ["correctText", "đáp án điền số", "đáp án", "answer", "correct"]);
          } else if (type === "TRUE_FALSE_SET") {
            question.statements = ["A", "B", "C", "D"].map((letter) => ({
              content: readField(row, [letter, "option " + letter]),
              isCorrect: ["D", "ĐÚNG", "TRUE", "1"].includes(readField(row, ["correct" + letter, "đúng sai " + letter]).toUpperCase()),
            }));
          }
          return question;
        });
        if (embedded.size > 0 && rows.length - 1 !== imported.length) {
          notes.push("Excel có dòng trống hoặc không đúng mẫu; hãy đối chiếu hình và câu hỏi trước khi xuất bản.");
        }
        for (const rowNum of embedded.keys()) {
          if (rowNum - 2 >= imported.length) notes.push("Ảnh ở dòng " + rowNum + " không có câu hỏi tương ứng.");
        }
      } else {
        throw new Error("Chỉ nhận JSON, XLSX, CSV hoặc TSV. Đề Word có ảnh nên chuyển sang Excel/JSON trước khi nhập.");
      }
      if (imported.length !== expectedCount) {
        throw new Error("Đề " + track + " (" + selected?.label + ") cần " + expectedCount + " câu, đã nhận " + imported.length + " câu.");
      }
      const missing = imported.findIndex((item) => !item || !String(item.prompt ?? "").trim());
      if (missing >= 0) throw new Error("Câu " + (missing + 1) + " không có nội dung.");
      setQuestions(imported);
      setWarnings(notes);
      setMessage("Đã đọc " + imported.length + " câu · " + (notes.length ? notes.length + " cảnh báo ảnh cần xem lại." : "Sẵn sàng kiểm tra và nhập."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không đọc được file.");
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (!ready || !rule) return;
    setBusy(true);
    setMessage("Đang xác thực cấu trúc và lưu đề nháp...");
    setCreated(null);
    try {
      const response = await fetch("/api/admin/exams/special-import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: {
          title: title.trim(), description: description.trim(), subjectId, track, variantId,
          year, accessLevel,
        }, questions }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được đề.");
      setCreated(result.exam);
      setMessage("Đã tạo " + result.questionCount + " câu đúng cấu trúc. Đề đang ở trạng thái nháp để Admin duyệt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tạo đề không thành công.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-black">1. Chọn đúng kỳ thi và tổ hợp</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">Kỳ thi
            <select className={classes} value={track} onChange={(event) => switchTrack(event.target.value as Track)}>
              {(["HSA", "TSA", "V_ACT", "QDA", "DGNL_BCA"] as Track[]).map((key) => (
                <option key={key} value={key}>{getAssessmentRule(key)?.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">Tổ hợp / mã bài thi
            <select className={classes} value={variantId} onChange={(event) => switchVariant(event.target.value)}>
              {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm font-semibold text-blue-700">
          {expectedCount} câu · {rule?.durationMinutes} phút ·
          {rule?.scoreMode === "IRT" ? " chấm số câu đúng, không giả lập điểm IRT chính thức" :
            rule?.scoreMode === "ESSAY_PENDING" ? " trắc nghiệm 75 điểm + tự luận 25 điểm" : " thang 150 điểm"}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {selected?.parts.map((part) => (
            <div key={part.key} className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-bold">{part.label}</p>
              <p className="text-slate-500">{part.blocks.reduce((sum, block) => sum + block.count, 0)} câu
                {part.durationMinutes ? " · " + part.durationMinutes + " phút" : ""}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-black">2. Nhập đề hoàn chỉnh</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Tải mẫu JSON đúng vị trí từng phần, sau đó thay nội dung, đáp án và lời giải. Có thể tải Excel
          với các cột question, type, A, B, C, D, correct, correctText, explanation, passage.
          Ảnh Excel được gắn theo dòng và cần kiểm tra trước khi xuất bản.
        </p>
        <button type="button" onClick={downloadTemplate}
          className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700">
          Tải mẫu JSON {track} – {variantId}
        </button>
        <label className="mt-4 block text-sm font-bold">Chọn đề JSON / Excel / CSV / TSV
          <input type="file" accept=".json,.xlsx,.csv,.tsv" onChange={(event) => {
            void upload(event.target.files?.[0]); event.target.value = "";
          }} className="mt-2 block w-full text-sm" />
        </label>
        {importName ? <p className="mt-3 text-sm font-semibold text-slate-700">{importName} · {questions.length}/{expectedCount} câu</p> : null}
        {questions.length > 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-bold">Xem trước:</p>
            {questions.slice(0, 3).map((item, index) => (
              <p key={index} className="mt-2 line-clamp-2 text-slate-700">
                Câu {index + 1} ({item.type}): {item.prompt.slice(0, 180)}
              </p>
            ))}
          </div>
        ) : null}
        {warnings.length ? (
          <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-black">Cần kiểm tra ảnh chưa nhập được</p>
            <ul className="mt-2 list-disc pl-5">{warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>
            <label className="mt-3 flex gap-2 font-semibold">
              <input type="checkbox" checked={warningsConfirmed} onChange={(event) => setWarningsConfirmed(event.target.checked)} />
              Tôi đã kiểm tra và xử lý ảnh cần thiết.
            </label>
          </div>
        ) : null}
      </section>
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-black">3. Kiểm tra và tạo đề nháp</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">Tên đề thi
            <input className={classes} value={title} maxLength={250} onChange={(event) => setTitle(event.target.value)} placeholder={"Đề thi thử " + track + " số 01"} />
          </label>
          <label className="grid gap-2 text-sm font-bold">Môn học quản lý
            <select className={classes} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              <option value="">Chọn môn học</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">Năm
            <input className={classes} type="number" min="2020" max="2200" value={year} onChange={(event) => setYear(Number(event.target.value))} />
          </label>
          <label className="grid gap-2 text-sm font-bold">Quyền truy cập
            <select className={classes} value={accessLevel} onChange={(event) => setAccessLevel(event.target.value as "FREE" | "PRO")}>
              <option value="FREE">Miễn phí</option><option value="PRO">VIP</option>
            </select>
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-bold">Mô tả
          <textarea className={classes} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={20000} />
        </label>
        <button type="button" disabled={!ready} onClick={() => void create()}
          className="mt-5 min-h-12 rounded-xl bg-orange-500 px-6 text-sm font-black text-white disabled:opacity-40">
          {busy ? "Đang xử lý..." : "Kiểm tra cấu trúc và tạo đề nháp"}
        </button>
        {message ? <p role="status" className="mt-4 rounded-xl bg-blue-50 p-4 text-sm font-bold text-blue-900">{message}</p> : null}
        {created ? <Link href={"/admin/questions?examId=" + encodeURIComponent(created.id)}
          className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white">
          Xem / sửa câu hỏi rồi xuất bản trong Quản lý đề
        </Link> : null}
      </section>
    </div>
  );
}
