"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  LoaderCircle,
  PencilLine,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { clsx } from "clsx";
import { getNationalExamRule, getNationalQuestionCount } from "@/lib/national-exam-rules";
import { RichContent as FormattedContent } from "@/components/rich-content";
import { parseDelimited, rowsToObjects } from "@/lib/spreadsheet-import";
import { parseAdminExamRows } from "@/lib/admin-exam-file-import";
import { buildReadingExcelTemplate } from "@/lib/reading-template";
import { isSafeRichImageUrl } from "@/lib/rich-image-security";

type Subject = { id: string; name: string; slug: string; family: "THPTQG" | "DGNL" };
type EducationLevel = "THCS" | "THPT" | "EXAM_10" | "THPTQG";
type Mode = "upload" | "quick" | "manual";
type ShareMode = "PUBLIC" | "PASSWORD" | "RESTRICTED";
type UserRole = "STUDENT" | "TEACHER" | "ADMIN";
type DraftQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  passage?: string;
};
type ImageTarget =
  | { questionId: string; field: "prompt" | "explanation" }
  | { questionId: string; field: "option"; optionIndex: number };
const modes = [
  {
    id: "upload" as const,
    title: "Tải file đề thi",
    description: "Nhập TXT, Excel, CSV hoặc ảnh. Công thức LaTeX và ảnh Markdown được giữ nguyên.",
    icon: UploadCloud,
    color: "bg-blue-500 shadow-blue-200",
  },
  {
    id: "quick" as const,
    title: "Dán nội dung nhanh",
    description: "Dán đề theo mẫu TXT, hệ thống tự tách câu hỏi, đáp án và lời giải.",
    icon: FileText,
    color: "bg-emerald-500 shadow-emerald-200",
  },
  {
    id: "manual" as const,
    title: "Soạn thủ công",
    description: "Tạo từng câu, chèn ảnh từ máy và xem trước công thức trước khi lưu.",
    icon: PencilLine,
    color: "bg-orange-500 shadow-orange-200",
  },
];

const txtTemplate = `Câu 1: Giải phương trình $x^2-5x+6=0$.
A. $x=2$ hoặc $x=3$
B. $x=1$ hoặc $x=6$
C. $x=-2$ hoặc $x=-3$
D. Vô nghiệm
Đáp án: A
Giải thích: $x^2-5x+6=(x-2)(x-3)$.

Câu 2: Công thức tính nồng độ mol là gì?
Ảnh: https://example.com/hinh-minh-hoa.png
A. $C_M=\\frac{n}{V}$
B. $D=\\frac{m}{V}$
C. $p=\\frac{F}{S}$
D. $v=\\frac{s}{t}$
Đáp án: A
Giải thích: Nồng độ mol bằng số mol chất tan chia cho thể tích dung dịch.`;

const spreadsheetHeaders = ["question", "image", "A", "B", "C", "D", "correct", "explanation"];
const spreadsheetSampleRows = [
  {
    question: "Giải phương trình $x^2-5x+6=0$.",
    image: "",
    A: "$x=2$ hoặc $x=3$",
    B: "$x=1$ hoặc $x=6$",
    C: "$x=-2$ hoặc $x=-3$",
    D: "Vô nghiệm",
    correct: "A",
    explanation: "$x^2-5x+6=(x-2)(x-3)$.",
  },
  {
    question: "Công thức tính nồng độ mol là gì?",
    image: "https://example.com/hinh-minh-hoa.png",
    A: "$C_M=\\frac{n}{V}$",
    B: "$D=\\frac{m}{V}$",
    C: "$p=\\frac{F}{S}$",
    D: "$v=\\frac{s}{t}$",
    correct: "A",
    explanation: "Nồng độ mol bằng số mol chất tan chia cho thể tích dung dịch.",
  },
];

function newQuestion(prompt = ""): DraftQuestion {
  return {
    id: crypto.randomUUID(),
    prompt,
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
    passage: "",
  };
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function appendImageMarkdown(value: string, src: string, alt = "Hình minh họa") {
  const image = src.trim();
  if (!image) return value.trim();
  return [value.trim(), `![${alt}](${image})`].filter(Boolean).join("\n");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const INLINE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_INLINE_UPLOAD_BYTES = 250_000;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getRowField(row: Record<string, unknown>, aliases: string[]) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [normalizeKey(key), value]));
  for (const alias of aliases) {
    const value = normalized.get(normalizeKey(alias));
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function correctIndexFrom(value: string, options: string[]) {
  const raw = value.trim();
  const letter = raw.match(/^[A-F]/i)?.[0]?.toUpperCase();
  if (letter) return Math.min(options.length - 1, Math.max(0, letter.charCodeAt(0) - 65));
  const normalized = normalizeKey(raw);
  const optionIndex = options.findIndex((option) => normalizeKey(option) === normalized);
  return optionIndex >= 0 ? optionIndex : 0;
}

function parseQuestions(text: string): DraftQuestion[] {
  const normalized = text.replace(/\r/g, "").trim();
  if (!normalized) return [];

  const matchedBlocks = normalized.match(/(?:^|\n)(?:Câu|Cau|Question)\s*\d+\s*[:.)-][\s\S]*?(?=\n(?:Câu|Cau|Question)\s*\d+\s*[:.)-]|\s*$)/gi);
  const blocks = (matchedBlocks ?? normalized.split(/\n\s*\n/)).map((block) => block.trim()).filter(Boolean);

  return blocks.flatMap((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const promptLines: string[] = [];
    const options: string[] = [];
    const explanationLines: string[] = [];
    let correctLetter = "A";
    let readingExplanation = false;

    for (const line of lines) {
      const promptMatch = line.match(/^(?:Câu|Cau|Question)\s*\d+\s*[:.)-]\s*(.*)$/i);
      const optionMatch = line.match(/^([A-F])\s*[\).:]\s*(.+)$/i);
      const answerMatch = line.match(/^(?:Đáp án|Dap an|Answer|Correct)\s*[:\-]\s*(.+)$/i);
      const imageMatch = line.match(/^(?:Ảnh|Anh|Hình|Hinh|Image)\s*[:\-]\s*(.+)$/i);
      const explanationMatch = line.match(/^(?:Giải thích|Giai thich|Explanation|Solution)\s*[:\-]\s*(.*)$/i);

      if (promptMatch) {
        if (promptMatch[1]) promptLines.push(promptMatch[1]);
        readingExplanation = false;
        continue;
      }
      if (optionMatch) {
        options[optionMatch[1].toUpperCase().charCodeAt(0) - 65] = optionMatch[2].trim();
        readingExplanation = false;
        continue;
      }
      if (answerMatch) {
        correctLetter = answerMatch[1].trim().charAt(0).toUpperCase() || "A";
        readingExplanation = false;
        continue;
      }
      if (imageMatch) {
        promptLines.push(`![Hình minh họa](${imageMatch[1].trim()})`);
        readingExplanation = false;
        continue;
      }
      if (explanationMatch) {
        readingExplanation = true;
        if (explanationMatch[1]) explanationLines.push(explanationMatch[1].trim());
        continue;
      }

      if (readingExplanation) explanationLines.push(line);
      else promptLines.push(line);
    }

    const cleanOptions = options.filter((option) => option !== undefined).map((option) => option.trim());
    if (!promptLines.length || cleanOptions.length < 2) return [];
    const correctIndex = Math.min(cleanOptions.length - 1, Math.max(0, correctLetter.charCodeAt(0) - 65));

    return [{
      id: crypto.randomUUID(),
      prompt: promptLines.join("\n").trim(),
      options: cleanOptions,
      correctIndex,
      explanation: explanationLines.join("\n").trim(),
    }];
  });
}

type ImportedFile = { questions: DraftQuestion[]; imageCount: number; warnings: string[] };

async function parseSpreadsheetFile(file: File): Promise<ImportedFile> {
  if (file.size > 8 * 1024 * 1024) throw new Error("Excel vượt quá 8 MB. Hãy chia nhỏ đề thi.");
  const lowerName = file.name.toLowerCase();
  let rawRows: readonly (readonly unknown[])[] = [];
  let pictures = new Map<number, string[]>();
  let imageCount = 0;
  const warnings: string[] = [];

  if (lowerName.endsWith(".xlsx")) {
    const { default: readWorkbook } = await import("read-excel-file/browser");
    const sheets = await readWorkbook(file) as unknown as Array<{ sheet: string; data: readonly (readonly unknown[])[] }>;
    if (!sheets.length) throw new Error("Không tìm thấy sheet nào trong Excel.");
    const questionSheet = sheets.find((sheet) => normalizeKey(sheet.sheet) === "cauhoi");
    const passageSheet = sheets.find((sheet) => normalizeKey(sheet.sheet) === "baidoc");
    const selectedSheet = questionSheet ?? sheets[0];
    const { extractXlsxEmbeddedImages } = await import("@/lib/office-image-import");
    const embedded = await extractXlsxEmbeddedImages(file, selectedSheet.sheet);
    pictures = embedded.byRow;
    imageCount = embedded.imageCount;
    warnings.push(...embedded.warnings);
    if (passageSheet) {
      if (!questionSheet) throw new Error("File có BAI_DOC phải có thêm sheet CAU_HOI.");
      const questions = parseAdminExamRows(questionSheet.data, passageSheet.data).map((question, index) => ({
        id: crypto.randomUUID(),
        prompt: [question.prompt, ...(pictures.get(index + 2) ?? []).map((src) => "![Hình minh họa](" + src + ")")].join("\n"),
        passage: question.passage,
        options: question.options,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
      }));
      if (pictures.size > 0 && questionSheet.data.length - 1 !== questions.length) {
        warnings.push("Có dòng Excel trống/không hợp lệ. Hãy kiểm tra vị trí ảnh trong bản xem trước.");
      }
      return { questions, imageCount, warnings };
    }
    rawRows = selectedSheet.data;
  } else {
    rawRows = parseDelimited(await file.text(), lowerName.endsWith(".tsv") ? "\t" : ",");
  }

  const rows = rowsToObjects(rawRows);
  const questions = rows.flatMap((row, index) => {
    const prompt = getRowField(row, ["question", "prompt", "cau hoi", "câu hỏi", "noi dung cau hoi", "nội dung câu hỏi"]);
    const image = getRowField(row, ["image", "anh", "ảnh", "hinh anh", "hình ảnh", "url anh", "image url"]);
    const options = ["A", "B", "C", "D", "E", "F"]
      .map((letter) => getRowField(row, [letter, "option " + letter, "phuong an " + letter, "phương án " + letter, "dap an " + letter, "đáp án " + letter]))
      .filter(Boolean);
    const correct = getRowField(row, ["correct", "answer", "dap an dung", "đáp án đúng", "dap an", "đáp án"]);
    const explanation = getRowField(row, ["explanation", "solution", "giai thich", "giải thích", "loi giai", "lời giải"]);
    const passage = getRowField(row, ["passage", "ngữ liệu", "đoạn văn"]);
    if (!prompt || options.length < 2) {
      if (pictures.has(index + 2)) warnings.push("Ảnh ở dòng " + (index + 2) + " không có câu hỏi hợp lệ.");
      return [];
    }
    let promptWithImage = prompt;
    if (image) {
      if (isSafeRichImageUrl(image)) promptWithImage = appendImageMarkdown(promptWithImage, image);
      else warnings.push("Dòng " + (index + 2) + ": URL ảnh ngoài không được nhúng vì lý do bảo mật; hãy chèn ảnh trực tiếp trong Excel hoặc trên Educhi.");
    }
    const attached = pictures.get(index + 2) ?? [];
    for (const src of attached) promptWithImage = appendImageMarkdown(promptWithImage, src);
    return [{
      id: crypto.randomUUID(),
      prompt: promptWithImage,
      options,
      correctIndex: correctIndexFrom(correct || "A", options),
      explanation,
      passage,
    }];
  });
  return { questions, imageCount, warnings };
}

export function ExamCreator({ subjects, role = "STUDENT" }: { subjects: Subject[]; role?: UserRole }) {
  const router = useRouter();
  const isTeacherMode = role === "TEACHER" || role === "ADMIN";
  const backHref = isTeacherMode ? "/teacher" : "/dashboard";
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [educationLevel, setEducationLevel] = useState<EducationLevel>("THCS");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [shareMode, setShareMode] = useState<ShareMode>("RESTRICTED");
  const [sharePassword, setSharePassword] = useState("");
  const [allowedEmails, setAllowedEmails] = useState("");
  const [rawText, setRawText] = useState(txtTemplate);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [questionsPage, setQuestionsPage] = useState(1);
  const QUESTIONS_PER_PAGE = 30;
  const questionPages = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_PAGE));
  const visiblePage = Math.min(questionsPage, questionPages);
  const firstVisibleQuestion = (visiblePage - 1) * QUESTIONS_PER_PAGE;
  const [fileName, setFileName] = useState("");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importImageCount, setImportImageCount] = useState(0);
  const [confirmedMissingImages, setConfirmedMissingImages] = useState(false);
  const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedMode = useMemo(() => modes.find((item) => item.id === mode), [mode]);
  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === subjectId), [subjectId, subjects]);
  const nationalRule = educationLevel === "THPTQG" && selectedSubject ? getNationalExamRule(selectedSubject.slug) : undefined;

  function chooseEducationLevel(level: EducationLevel) {
    // Personal practice exams may target THPTQG topics without mimicking a
    // full official paper. Do not lock time or question count.
    setEducationLevel(level);
  }

  function chooseSubject(id: string) {
    setSubjectId(id);
  }

  function chooseMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage(null);
    if (nextMode === "manual" && !questions.length) setQuestions([newQuestion()]);
  }

  function addQuestion() {
    setQuestions((current) => [...current, newQuestion()]);
    setQuestionsPage(Math.floor(questions.length / QUESTIONS_PER_PAGE) + 1);
  }

  function updateQuestion(id: string, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question) => (question.id === id ? { ...question, ...patch } : question)));
  }

  function updateOption(questionId: string, optionIndex: number, value: string) {
    setQuestions((current) => current.map((question) => {
      if (question.id !== questionId) return question;
      const options = [...question.options];
      options[optionIndex] = value;
      return { ...question, options };
    }));
  }

  function analyzeText() {
    const parsed = parseQuestions(rawText);
    setQuestions(parsed);
    setQuestionsPage(1);
    setMessage(parsed.length ? `Đã phân tích ${parsed.length} câu hỏi.` : "Không nhận diện được câu hỏi. Hãy dùng đúng mẫu TXT.");
  }

  async function handleFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setMessage("Đang phân tích tệp...");
    setImportWarnings([]);
    setImportImageCount(0);
    setConfirmedMissingImages(false);

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".txt")) {
      const parsed = parseQuestions(await file.text());
      setQuestions(parsed);
      setQuestionsPage(1);
      setMessage(parsed.length ? `Đã trích xuất ${parsed.length} câu hỏi từ ${file.name}.` : "Không nhận diện được câu hỏi trong tệp TXT.");
      return;
    }

    if (lowerName.endsWith(".xls")) {
      setMessage("Định dạng XLS cũ không được hỗ trợ. Hãy lưu lại dưới dạng XLSX hoặc CSV.");
      return;
    }

    if (/\.(xlsx|csv|tsv)$/i.test(lowerName)) {
      try {
        const result = await parseSpreadsheetFile(file);
        setQuestions(result.questions);
        setImportWarnings(result.warnings);
        setImportImageCount(result.imageCount);
        setQuestionsPage(1);
        setMessage(result.questions.length
          ? "Đã nhập " + result.questions.length + " câu hỏi, đính kèm " + result.imageCount + " hình minh họa từ " + file.name + "."
          : "Excel cần có các cột question, A, B, C, D, correct.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Không đọc được file Excel. Hãy tải file mẫu rồi điền theo đúng cột.");
      }
      return;
    }

    if (lowerName.endsWith(".docx")) {
      try {
        const { extractDocxWithImages } = await import("@/lib/office-image-import");
        const result = await extractDocxWithImages(file);
        const parsed = parseQuestions(result.text);
        setQuestions(parsed);
        setQuestionsPage(1);
        setImportWarnings(result.warnings);
        setImportImageCount(result.imageCount);
        setMessage(parsed.length
          ? "Đã nhập " + parsed.length + " câu hỏi và " + result.imageCount + " hình từ Word. Hãy đối chiếu bản xem trước."
          : "Đã đọc Word nhưng chưa nhận dạng được câu hỏi. Dùng mẫu Câu 1, A/B/C/D, Đáp án.");
      } catch (error) {
        setQuestions([]);
        setMessage(error instanceof Error ? error.message : "Không đọc được file Word.");
      }
      return;
    }

    if (lowerName.endsWith(".pdf")) {
      setQuestions([]);
      setMessage("Chưa hỗ trợ tự tách ảnh từ PDF. Hãy chuyển sang DOCX/XLSX để giữ ảnh hoặc chèn ảnh thủ công; không được xuất bản đề mất hình.");
      return;
    }

    if (file.type.startsWith("image/")) {
      if (!INLINE_IMAGE_TYPES.has(file.type)) {
        setMessage("Chỉ hỗ trợ PNG, JPEG, WebP hoặc GIF. Không hỗ trợ SVG.");
        return;
      }
      if (file.size > MAX_INLINE_UPLOAD_BYTES) {
        setMessage("Ảnh nhúng cần nhỏ hơn 250KB. Hãy nén ảnh trước khi tải lên.");
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      setQuestionsPage(1);
      setQuestions([{
        ...newQuestion(`Quan sát hình và trả lời câu hỏi.\n![${file.name}](${dataUrl})`),
      }]);
      setMessage("Đã chèn ảnh thành câu hỏi nháp. Hãy nhập nội dung và đáp án.");
      return;
    }

    setQuestions([]);
    setMessage("Định dạng này chưa được hỗ trợ. Hãy dùng TXT, Excel, CSV, TSV hoặc ảnh.");
  }

  async function handleQuestionImage(file?: File) {
    if (!file || !imageTarget) return;
    if (!INLINE_IMAGE_TYPES.has(file.type)) {
      setMessage("Chỉ hỗ trợ ảnh PNG, JPEG, WebP hoặc GIF. Không hỗ trợ SVG.");
      return;
    }
    if (file.size > MAX_INLINE_UPLOAD_BYTES) {
      setMessage("Ảnh nhúng cần nhỏ hơn 250KB. Hãy nén ảnh trước khi tải lên.");
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    const markdown = `\n![${file.name}](${dataUrl})`;
    setQuestions((current) => current.map((question) => {
      if (question.id !== imageTarget.questionId) return question;
      if (imageTarget.field === "prompt") return { ...question, prompt: `${question.prompt.trim()}${markdown}`.trim() };
      if (imageTarget.field === "explanation") return { ...question, explanation: `${question.explanation.trim()}${markdown}`.trim() };
      if (imageTarget.field !== "option") return question;
      const options = [...question.options];
      options[imageTarget.optionIndex] = `${options[imageTarget.optionIndex].trim()}${markdown}`.trim();
      return { ...question, options };
    }));
    setImageTarget(null);
    setMessage("Đã chèn ảnh vào câu hỏi.");
    if (imageInput.current) imageInput.current.value = "";
  }

  function requestImage(target: ImageTarget) {
    setImageTarget(target);
    imageInput.current?.click();
  }

  function downloadTxtTemplate() {
    downloadBlob(new Blob([txtTemplate], { type: "text/plain;charset=utf-8" }), "mau-tao-de-thi.txt");
  }

  async function downloadExcelTemplate() {
    const { default: writeExcelFile } = await import("write-excel-file/browser");
    const columns = [42, 34, 24, 24, 24, 24, 12, 48].map((width) => ({ width }));
    const data = [
      spreadsheetHeaders,
      ...spreadsheetSampleRows.map((row) =>
        spreadsheetHeaders.map((header) => row[header as keyof typeof row] ?? ""),
      ),
    ];
    const blob = await writeExcelFile(data, { sheet: "questions", columns }).toBlob();
    downloadBlob(blob, "mau-tao-de-thi.xlsx");
  }

  async function downloadReadingTemplate() {
    downloadBlob(await buildReadingExcelTemplate(), "mau-de-tieng-anh-bai-doc.xlsx");
  }

  async function saveExam() {
    setMessage(null);
    const validQuestions = questions.map((question) => ({
      ...question,
      prompt: question.prompt.trim(),
      options: question.options.map((option) => option.trim()),
      explanation: question.explanation.trim(),
    }));

    if (!title.trim() || !subjectId) return setMessage("Vui lòng nhập tên đề và chọn môn học.");
    if (shareMode === "PASSWORD" && !sharePassword.trim()) return setMessage("Vui lòng nhập mật khẩu cho đề thi.");
    if (!validQuestions.length) return setMessage("Đề thi cần ít nhất một câu hỏi.");
    if (importWarnings.length && !confirmedMissingImages) {
      return setMessage("Còn cảnh báo về hình minh họa. Hãy kiểm tra từng câu và xác nhận trước khi tạo đề.");
    }
    if (validQuestions.some((question) => !question.prompt || question.options.some((option) => !option))) {
      return setMessage("Vui lòng điền đầy đủ câu hỏi và các phương án.");
    }

    setSaving(true);
    const response = await fetch("/api/exams/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subjectId,
        educationLevel,
        durationMinutes,
        shareMode,
        sharePassword: shareMode === "PASSWORD" ? sharePassword.trim() : undefined,
        allowedEmails: allowedEmails
          .split(/[\n,;]/)
          .map((email) => email.trim())
          .filter(Boolean),
        questions: validQuestions.map(({ prompt, options, correctIndex, explanation, passage }) => ({
          prompt,
          options,
          correctIndex,
          explanation,
          passage: passage?.trim() || undefined,
        })),
      }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) return setMessage(data.error ?? "Không thể tạo đề thi.");
    router.push(isTeacherMode ? "/exams/my" : `/exams/${data.exam.id}`);
    router.refresh();
  }

  const templateButtons = (
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={downloadTxtTemplate} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
        <Download className="h-4 w-4" /> Mẫu TXT
      </button>
      <button type="button" onClick={() => void downloadExcelTemplate()} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
        <FileSpreadsheet className="h-4 w-4" /> Mẫu Excel
      </button>
      <button type="button" onClick={() => void downloadReadingTemplate()} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-black text-white">
        <FileSpreadsheet className="h-4 w-4" /> Mẫu Excel bài đọc
      </button>
    </div>
  );

  if (!mode) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#fffdf8]">
        <div className="border-b border-orange-100 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:gap-5 sm:px-6 sm:py-7">
            <Link href={backHref} className="grid h-11 w-11 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900 sm:text-3xl">Tạo đề thi mới</h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Hỗ trợ TXT, Excel, CSV, công thức LaTeX và ảnh trong câu hỏi cho học sinh lẫn giáo viên.
              </p>
            </div>
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-5 sm:gap-6 sm:px-6 sm:py-10 lg:grid-cols-3">
          {modes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseMode(item.id)}
                className="group flex min-h-[112px] items-start gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-orange-100 hover:shadow-lg sm:block sm:min-h-64 sm:rounded-[2rem] sm:p-7 lg:min-h-80 lg:p-10"
              >
                <span className={clsx("grid h-14 w-14 shrink-0 place-items-center rounded-xl text-white shadow-lg sm:h-20 sm:w-20 sm:rounded-2xl", item.color)}>
                  <Icon className="h-7 w-7 sm:h-10 sm:w-10" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black text-slate-900 sm:mt-7 sm:text-2xl lg:mt-9">{item.title}</h2>
                  <p className="mt-1 max-w-xs text-sm leading-5 text-slate-500 sm:mt-3 sm:text-base sm:leading-7">{item.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#fffdf8] pb-16">
      <input ref={imageInput} type="file" accept="image/*" className="hidden" onChange={(event) => void handleQuestionImage(event.target.files?.[0])} />

      <div className="border-b border-orange-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-6 sm:px-6">
          <button type="button" onClick={() => setMode(null)} className="grid h-11 w-11 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-500">
              {isTeacherMode ? "Kho đề giáo viên" : "Tạo đề thi mới"}
            </p>
            <h1 className="text-2xl font-black text-slate-900">{selectedMode?.title}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="grid gap-4 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-[1fr_190px_220px_170px] sm:p-6">
          <label className="text-sm font-bold text-slate-700">
            Tên đề thi
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Kiểm tra 15 phút - Chương 1" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-orange-400" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Cấp học
            <select value={educationLevel} onChange={(event) => chooseEducationLevel(event.target.value as EducationLevel)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-400">
              <option value="THCS">THCS</option>
              <option value="THPT">THPT</option>
              <option value="EXAM_10">Ôn thi vào 10</option>
              <option value="THPTQG">Ôn thi THPTQG</option>
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Môn học
            <select value={subjectId} onChange={(event) => chooseSubject(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-400">
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Thời gian (phút)
            <input type="number" min={5} max={300} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400 disabled:bg-slate-100 disabled:text-slate-500" />
          </label>
        </section>

        <section className="mt-4 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Chia sẻ & quyền truy cập</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Lưu vào kho đề thi của bạn</h2>
              <p className="mt-1 text-sm text-slate-500">Sau khi tạo, đề sẽ có link chia sẻ riêng. Có thể đặt mật khẩu hoặc giới hạn email.</p>
            </div>
            <Link href="/exams/my" className="inline-flex rounded-full border border-orange-200 px-4 py-2 text-sm font-black text-orange-600 transition hover:bg-orange-50">
              Mở kho đề của bạn
            </Link>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              { value: "PUBLIC", title: "Công khai bằng link", text: "Ai có link đều xem và làm được đề." },
              { value: "PASSWORD", title: "Yêu cầu mật khẩu", text: "Người nhận link cần nhập mật khẩu để vào đề." },
              { value: "RESTRICTED", title: "Chỉ người được cấp quyền", text: "Chỉ email trong danh sách mới được truy cập." },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setShareMode(item.value as ShareMode)}
                className={clsx(
                  "rounded-2xl border p-4 text-left transition",
                  shareMode === item.value ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200",
                )}
              >
                <span className="font-black">{item.title}</span>
                <span className="mt-1 block text-sm leading-6">{item.text}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className={clsx("text-sm font-bold text-slate-700", shareMode !== "PASSWORD" && "opacity-50")}>
              Mật khẩu đề thi
              <input
                value={sharePassword}
                onChange={(event) => setSharePassword(event.target.value)}
                disabled={shareMode !== "PASSWORD"}
                placeholder="Ví dụ: educhi-2026"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400 disabled:bg-slate-100"
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Email được cấp quyền
              <textarea
                value={allowedEmails}
                onChange={(event) => setAllowedEmails(event.target.value)}
                placeholder="Mỗi dòng một email, hoặc phân tách bằng dấu phẩy"
                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400"
              />
            </label>
          </div>
        </section>

        {educationLevel === "THPTQG" ? (
          <section className="mt-4 rounded-[2rem] border border-blue-100 bg-blue-50/60 p-5">
            {nationalRule ? (
              <>
                <p className="font-black text-blue-800">Cấu trúc THPTQG tham khảo · {nationalRule.durationMinutes} phút · {getNationalQuestionCount(nationalRule)} câu</p>
                 <p className="mt-2 text-sm font-semibold text-blue-700">Đây là đề luyện tập do bạn tự tạo: số câu, nội dung và thời gian đều do bạn quyết định. Chỉ đề THPTQG chính thức do admin công bố mới bắt buộc đúng cấu trúc.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {nationalRule.parts.filter((part) => part.count > 0).map((part) => (
                    <span key={part.key} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-blue-700 shadow-sm">
                      {part.label}: {part.count} câu
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="font-bold text-blue-700">Bạn có thể tạo đề luyện tập tùy số câu và thời gian cho môn học này.</p>
            )}
          </section>
        ) : null}

        {mode === "upload" ? (
          <section className="mt-6 rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">Nhập đề từ file</h2>
                <p className="mt-1 text-sm text-slate-500">Excel cũ: question, image, A, B, C, D, correct, explanation. Bài đọc hiểu: dùng mẫu Excel hai sheet BAI_DOC và CAU_HOI, liên kết bằng group_id. File cũ vẫn tương thích.</p>
              </div>
              {templateButtons}
            </div>
            <input ref={fileInput} type="file" accept=".txt,.xlsx,.csv,.tsv,.docx,.pdf,image/*" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
            <button type="button" onClick={() => fileInput.current?.click()} className="mt-5 grid min-h-56 w-full place-items-center rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-6 text-center transition hover:border-blue-400">
              <span>
                <UploadCloud className="mx-auto h-12 w-12 text-blue-500" />
                <span className="mt-4 block text-lg font-black text-slate-800">{fileName || "Chọn TXT, Excel, CSV, Word DOCX hoặc ảnh"}</span>
                <span className="mt-2 block text-sm text-slate-500">Excel/Word: nhận ảnh được nhúng trong file. PDF hiện cần chuyển sang Word hoặc chèn ảnh thủ công.</span>
              </span>
            </button>
            {importImageCount > 0 ? (
              <p role="status" className="mt-3 text-sm font-bold text-emerald-700">Đã lấy {importImageCount} hình minh họa và đính kèm vào bản xem trước.</p>
            ) : null}
            {importWarnings.length > 0 ? (
              <div role="alert" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-black">Cần kiểm tra {importWarnings.length} cảnh báo hình ảnh trước khi tạo đề</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {importWarnings.slice(0, 12).map((warning, index) => <li key={index}>{warning}</li>)}
                </ul>
                {importWarnings.length > 12 ? <p className="mt-2">Còn cảnh báo khác; hãy chia đề để kiểm tra đầy đủ.</p> : null}
                <label className="mt-3 flex items-start gap-2 font-bold">
                  <input type="checkbox" className="mt-1" checked={confirmedMissingImages} onChange={(event) => setConfirmedMissingImages(event.target.checked)} />
                  Tôi đã kiểm tra từng hình minh họa trong bản xem trước và đồng ý tạo đề.
                </label>
              </div>
            ) : null}
          </section>
        ) : null}

        {mode === "quick" ? (
          <section className="mt-6 rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">Dán nội dung đề thi</h2>
                <p className="mt-1 text-sm text-slate-500">Dùng $...$ cho công thức trong dòng, $...$ cho công thức tách dòng, và Ảnh: đường dẫn cùng website cho hình minh họa.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {templateButtons}
                <button type="button" onClick={analyzeText} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-extrabold text-white">
                  <Sparkles className="h-4 w-4" /> Phân tích
                </button>
              </div>
            </div>
            <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} className="mt-4 min-h-72 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-7 outline-none focus:border-emerald-400" />
          </section>
        ) : null}

        <section id="question-list" className="mt-6 scroll-mt-20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Danh sách câu hỏi</h2>
              <p className="mt-1 text-sm text-slate-500">
                {questions.length} câu hỏi
                {" · Tự chọn số câu, không bắt buộc theo cấu trúc đề chính thức."}
              </p>
            </div>
            <button type="button" onClick={addQuestion} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2.5 text-sm font-extrabold text-orange-600">
              <Plus className="h-4 w-4" /> Thêm câu
            </button>
          </div>

          {questionPages > 1 ? (
            <nav aria-label="Trang danh sách câu hỏi" className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-orange-50 p-3 text-xs font-bold text-slate-700 sm:text-sm">
              <button type="button" disabled={visiblePage === 1} onClick={() => setQuestionsPage(visiblePage - 1)} className="rounded-lg bg-white px-3 py-2 text-orange-600 disabled:opacity-40">Trang trước</button>
              <span>Trang {visiblePage}/{questionPages} · Hiển thị tối đa {QUESTIONS_PER_PAGE} câu</span>
              <button type="button" disabled={visiblePage === questionPages} onClick={() => setQuestionsPage(visiblePage + 1)} className="rounded-lg bg-white px-3 py-2 text-orange-600 disabled:opacity-40">Trang sau</button>
            </nav>
          ) : null}
          <div className="mt-5 space-y-5">
            {questions.slice(firstVisibleQuestion, firstVisibleQuestion + QUESTIONS_PER_PAGE).map((question, localIndex) => (
              <article key={question.id} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-800">Câu {firstVisibleQuestion + localIndex + 1}</h3>
                  <button type="button" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <label className="text-sm font-black text-slate-700">Nội dung câu hỏi</label>
                  <button type="button" onClick={() => requestImage({ questionId: question.id, field: "prompt" })} className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-3 py-1.5 text-xs font-black text-blue-600">
                    <ImagePlus className="h-4 w-4" /> Chèn ảnh
                  </button>
                </div>
                <textarea value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} placeholder="Nhập nội dung câu hỏi. Ví dụ: Tính $C_M=\\frac{n}{V}$" className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 p-4 font-semibold outline-none focus:border-orange-400" />
                <details className="mt-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                  <summary className="cursor-pointer text-sm font-bold text-blue-700">Ngữ liệu / bài đọc dùng chung {question.passage ? "(đã có)" : "(tùy chọn)"}</summary>
                  <textarea value={question.passage ?? ""} onChange={(event) => updateQuestion(question.id, { passage: event.target.value })} placeholder="Dán bài đọc hoặc nhập bằng file Excel BAI_DOC + CAU_HOI." className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" />
                </details>
                {question.prompt ? (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                    <FormattedContent value={question.prompt} imageClassName="max-h-56" />
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className={clsx("flex items-center gap-3 rounded-2xl border p-3 transition", question.correctIndex === optionIndex ? "border-emerald-400 bg-emerald-50" : "border-slate-200")}>
                      <input type="radio" name={`correct-${question.id}`} checked={question.correctIndex === optionIndex} onChange={() => updateQuestion(question.id, { correctIndex: optionIndex })} />
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-600">{String.fromCharCode(65 + optionIndex)}</span>
                      <input value={option} onChange={(event) => updateOption(question.id, optionIndex, event.target.value)} placeholder={`Phương án ${String.fromCharCode(65 + optionIndex)}`} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                      <button type="button" onClick={() => requestImage({ questionId: question.id, field: "option", optionIndex })} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-blue-500 hover:bg-blue-50" aria-label={`Chèn ảnh vào phương án ${String.fromCharCode(65 + optionIndex)}`}>
                        <ImagePlus className="h-4 w-4" />
                      </button>
                      {question.correctIndex === optionIndex ? <Check className="h-4 w-4 text-emerald-500" /> : null}
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <label className="text-sm font-black text-slate-700">Giải thích đáp án</label>
                  <button type="button" onClick={() => requestImage({ questionId: question.id, field: "explanation" })} className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-3 py-1.5 text-xs font-black text-blue-600">
                    <ImagePlus className="h-4 w-4" /> Chèn ảnh
                  </button>
                </div>
                <textarea value={question.explanation} onChange={(event) => updateQuestion(question.id, { explanation: event.target.value })} placeholder="Giải thích sau khi học sinh nộp bài" className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400" />
              </article>
            ))}
            {!questions.length ? <div className="rounded-[2rem] border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">Chưa có câu hỏi. Hãy phân tích nội dung, nhập file hoặc thêm câu thủ công.</div> : null}
          </div>
          {questionPages > 1 ? (
            <div className="mt-4 flex justify-center gap-4 text-sm font-bold text-orange-600">
              <button type="button" disabled={visiblePage === 1} onClick={() => { setQuestionsPage(visiblePage - 1); document.getElementById("question-list")?.scrollIntoView({ block: "start" }); }} className="rounded-xl border border-orange-200 px-4 py-2 disabled:opacity-40">← Trước</button>
              <span className="self-center">{visiblePage}/{questionPages}</span>
              <button type="button" disabled={visiblePage === questionPages} onClick={() => { setQuestionsPage(visiblePage + 1); document.getElementById("question-list")?.scrollIntoView({ block: "start" }); }} className="rounded-xl border border-orange-200 px-4 py-2 disabled:opacity-40">Sau →</button>
            </div>
          ) : null}
        </section>

        <div className="sticky bottom-[calc(7.5rem+env(safe-area-inset-bottom))] mt-8 flex items-center justify-between gap-4 rounded-2xl lg:bottom-4 border border-orange-100 bg-white/95 p-4 shadow-lg backdrop-blur">
          <p className={clsx("text-sm font-semibold", message?.includes("Không") || message?.includes("Vui lòng") ? "text-red-500" : "text-slate-500")}>{message}</p>
          <button type="button" onClick={saveExam} disabled={saving} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-orange-200 disabled:opacity-60">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Đang lưu..." : "Tạo đề thi"}
          </button>
        </div>
      </div>
    </div>
  );
}
