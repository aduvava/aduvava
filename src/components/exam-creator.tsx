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

async function parseSpreadsheetFile(file: File): Promise<DraftQuestion[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });
  return rows.flatMap((row) => {
    const prompt = getRowField(row, ["question", "prompt", "cau hoi", "câu hỏi", "noi dung cau hoi", "nội dung câu hỏi"]);
    const image = getRowField(row, ["image", "anh", "ảnh", "hinh anh", "hình ảnh", "url anh", "image url"]);
    const options = ["A", "B", "C", "D", "E", "F"]
      .map((letter) => getRowField(row, [letter, `option ${letter}`, `phuong an ${letter}`, `phương án ${letter}`, `dap an ${letter}`, `đáp án ${letter}`]))
      .filter(Boolean);
    const correct = getRowField(row, ["correct", "answer", "dap an dung", "đáp án đúng", "dap an", "đáp án"]);
    const explanation = getRowField(row, ["explanation", "solution", "giai thich", "giải thích", "loi giai", "lời giải"]);

    if (!prompt || options.length < 2) return [];
    return [{
      id: crypto.randomUUID(),
      prompt: appendImageMarkdown(prompt, image),
      options,
      correctIndex: correctIndexFrom(correct || "A", options),
      explanation,
    }];
  });
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
  const [shareMode, setShareMode] = useState<ShareMode>("PUBLIC");
  const [sharePassword, setSharePassword] = useState("");
  const [allowedEmails, setAllowedEmails] = useState("");
  const [rawText, setRawText] = useState(txtTemplate);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [fileName, setFileName] = useState("");
  const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedMode = useMemo(() => modes.find((item) => item.id === mode), [mode]);
  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === subjectId), [subjectId, subjects]);
  const nationalRule = educationLevel === "THPTQG" && selectedSubject ? getNationalExamRule(selectedSubject.slug) : undefined;

  function chooseEducationLevel(level: EducationLevel) {
    setEducationLevel(level);
    if (level === "THPTQG" && selectedSubject) {
      const rule = getNationalExamRule(selectedSubject.slug);
      if (rule) setDurationMinutes(rule.durationMinutes);
    }
  }

  function chooseSubject(id: string) {
    setSubjectId(id);
    const subject = subjects.find((item) => item.id === id);
    if (educationLevel === "THPTQG" && subject) {
      const rule = getNationalExamRule(subject.slug);
      if (rule) setDurationMinutes(rule.durationMinutes);
    }
  }

  function chooseMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage(null);
    if (nextMode === "manual" && !questions.length) setQuestions([newQuestion()]);
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
    setMessage(parsed.length ? `Đã phân tích ${parsed.length} câu hỏi.` : "Không nhận diện được câu hỏi. Hãy dùng đúng mẫu TXT.");
  }

  async function handleFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setMessage("Đang phân tích tệp...");

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".txt")) {
      const parsed = parseQuestions(await file.text());
      setQuestions(parsed);
      setMessage(parsed.length ? `Đã trích xuất ${parsed.length} câu hỏi từ ${file.name}.` : "Không nhận diện được câu hỏi trong tệp TXT.");
      return;
    }

    if (/\.(xlsx|xls|csv|tsv)$/i.test(lowerName)) {
      try {
        const parsed = await parseSpreadsheetFile(file);
        setQuestions(parsed);
        setMessage(parsed.length ? `Đã nhập ${parsed.length} câu hỏi từ ${file.name}.` : "Excel cần có các cột question, A, B, C, D, correct.");
      } catch {
        setMessage("Không đọc được file Excel. Hãy tải file mẫu rồi điền theo đúng cột.");
      }
      return;
    }

    if (file.type.startsWith("image/")) {
      if (file.size > 1_500_000) {
        setMessage("Ảnh nên nhỏ hơn 1.5MB để lưu vào đề thi. Hãy nén ảnh hoặc dùng link ảnh.");
        return;
      }
      const dataUrl = await fileToDataUrl(file);
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
    if (!file.type.startsWith("image/")) {
      setMessage("Vui lòng chọn tệp ảnh.");
      return;
    }
    if (file.size > 1_500_000) {
      setMessage("Ảnh nên nhỏ hơn 1.5MB để lưu vào đề thi. Hãy nén ảnh hoặc dùng link ảnh.");
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
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(spreadsheetSampleRows, { header: spreadsheetHeaders });
    (worksheet as unknown as { "!cols"?: Array<{ wch: number }> })["!cols"] = [
      { wch: 42 },
      { wch: 34 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 12 },
      { wch: 48 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "questions");
    const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    downloadBlob(new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "mau-tao-de-thi.xlsx");
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
        questions: validQuestions.map(({ prompt, options, correctIndex, explanation }) => ({
          prompt,
          options,
          correctIndex,
          explanation,
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
    </div>
  );

  if (!mode) {
    return (
      <div className="min-h-[calc(100vh-76px)] bg-[#fffdf8]">
        <div className="border-b border-orange-100 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-7 sm:px-6">
            <Link href={backHref} className="grid h-11 w-11 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Tạo đề thi mới</h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Hỗ trợ TXT, Excel, CSV, công thức LaTeX và ảnh trong câu hỏi cho học sinh lẫn giáo viên.
              </p>
            </div>
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-3">
          {modes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseMode(item.id)}
                className="group min-h-80 rounded-[3rem] border border-slate-100 bg-white p-10 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-orange-100 hover:shadow-lg"
              >
                <span className={clsx("grid h-20 w-20 place-items-center rounded-2xl text-white shadow-lg", item.color)}>
                  <Icon className="h-10 w-10" strokeWidth={1.8} />
                </span>
                <h2 className="mt-9 text-2xl font-black text-slate-900">{item.title}</h2>
                <p className="mt-3 max-w-xs text-base leading-7 text-slate-500">{item.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-76px)] bg-[#fffdf8] pb-16">
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
            <input type="number" min={5} max={300} disabled={Boolean(nationalRule)} value={nationalRule?.durationMinutes ?? durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400 disabled:bg-slate-100 disabled:text-slate-500" />
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
                placeholder="Ví dụ: ava-2026"
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
                <p className="font-black text-blue-800">Cấu trúc THPTQG bắt buộc · {nationalRule.durationMinutes} phút · {getNationalQuestionCount(nationalRule)} câu</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {nationalRule.parts.filter((part) => part.count > 0).map((part) => (
                    <span key={part.key} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-blue-700 shadow-sm">
                      {part.label}: {part.count} câu
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="font-bold text-amber-700">Môn này chưa có cấu trúc THPTQG trong bảng quy định.</p>
            )}
          </section>
        ) : null}

        {mode === "upload" ? (
          <section className="mt-6 rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">Nhập đề từ file</h2>
                <p className="mt-1 text-sm text-slate-500">Excel dùng các cột: question, image, A, B, C, D, correct, explanation. Cột image nhận link ảnh hoặc data:image.</p>
              </div>
              {templateButtons}
            </div>
            <input ref={fileInput} type="file" accept=".txt,.xlsx,.xls,.csv,.tsv,.pdf,image/*" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
            <button type="button" onClick={() => fileInput.current?.click()} className="mt-5 grid min-h-56 w-full place-items-center rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-6 text-center transition hover:border-blue-400">
              <span>
                <UploadCloud className="mx-auto h-12 w-12 text-blue-500" />
                <span className="mt-4 block text-lg font-black text-slate-800">{fileName || "Chọn TXT, Excel, CSV, PDF hoặc ảnh"}</span>
                <span className="mt-2 block text-sm text-slate-500">TXT/Excel được tách trực tiếp. Ảnh có thể chèn vào câu hỏi bằng nút Chèn ảnh.</span>
              </span>
            </button>
          </section>
        ) : null}

        {mode === "quick" ? (
          <section className="mt-6 rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">Dán nội dung đề thi</h2>
                <p className="mt-1 text-sm text-slate-500">Dùng $...$ cho công thức trong dòng, $$...$$ cho công thức tách dòng, và Ảnh: URL cho hình minh họa.</p>
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

        <section className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Danh sách câu hỏi</h2>
              <p className="mt-1 text-sm text-slate-500">
                {questions.length} câu hỏi
                {nationalRule ? ` / yêu cầu ${getNationalQuestionCount(nationalRule)} câu theo cấu trúc THPTQG.` : ", có thể chỉnh sửa trước khi lưu."}
              </p>
            </div>
            <button type="button" onClick={() => setQuestions((current) => [...current, newQuestion()])} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2.5 text-sm font-extrabold text-orange-600">
              <Plus className="h-4 w-4" /> Thêm câu
            </button>
          </div>

          <div className="mt-5 space-y-5">
            {questions.map((question, questionIndex) => (
              <article key={question.id} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-800">Câu {questionIndex + 1}</h3>
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
        </section>

        <div className="sticky bottom-4 mt-8 flex items-center justify-between gap-4 rounded-2xl border border-orange-100 bg-white/95 p-4 shadow-lg backdrop-blur">
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
