const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");

loadEnv(path.join(__dirname, "..", ".env"));

const prisma = new PrismaClient();
const port = Number(process.env.ADMIN_PORT || 4000);
const sessions = new Map();
const sessionCookie = "ava_admin_session";
const adminDataDir = path.join(__dirname, "data");
const announcementConfigPath = path.join(adminDataDir, "announcements.json");
const dashboardContentConfigPath = path.join(adminDataDir, "dashboard-content.json");

const resources = [
  { href: "/store-items", label: "Cửa hàng" },
  { href: "/motivation", label: "Động lực" },
  { href: "/", label: "Tổng quan" },
  { href: "/users", label: "Người dùng" },
  { href: "/exams", label: "Đề thi" },
  { href: "/documents", label: "Tài liệu" },
  { href: "/payments", label: "Thanh toán & VIP" },
];

const studyFlows = [
  {
    id: "THCS",
    label: "Trung học cơ sở",
    grades: ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"],
    subjects: ["Toán", "Ngữ Văn", "Tiếng Anh", "Lịch Sử", "Địa Lý", "KHTN (Sinh Học)", "KHTN (Vật Lý)", "KHTN (Hóa Học)", "Công Nghệ"],
  },
  {
    id: "THPT",
    label: "Trung học phổ thông",
    grades: ["Lớp 10", "Lớp 11", "Lớp 12"],
    subjects: ["Toán", "Ngữ Văn", "Tiếng Anh", "Lịch Sử", "Địa Lý", "Vật Lý", "Hóa Học", "Sinh Học", "Công Nghệ", "Tin Học", "KT&PL"],
  },
  {
    id: "EXAM_10",
    label: "Ôn thi vào 10",
    grades: ["Môn thi"],
    subjects: ["Toán", "Ngữ Văn", "Tiếng Anh"],
  },
  {
    id: "THPTQG",
    label: "Ôn thi THPTQG",
    grades: ["Môn thi"],
    subjects: ["Toán", "Ngữ Văn", "Tiếng Anh", "Lịch Sử", "Địa Lý", "Vật Lý", "Hóa Học", "Sinh Học", "Công Nghệ", "Tin Học", "KT&PL"],
  },
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || `de-thi-${Date.now()}`;
}

function optionList(items, selectedValue = "") {
  return items.map((item) => {
    const value = typeof item === "string" ? item : item.value;
    const label = typeof item === "string" ? item : item.label;
    return `<option value="${escapeHtml(value)}"${selected(value, selectedValue)}>${escapeHtml(label)}</option>`;
  }).join("");
}

function answerLabel(index) {
  return String.fromCharCode(65 + index);
}

function normalizeHeader(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

function parseCsvLine(line, delimiter = ",") {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function pickField(record, names) {
  for (const name of names) {
    const value = record[name];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function normalizeImageList(input) {
  const raw = input.images ?? input.image ?? input.imageUrl ?? input.imageurl ?? input.image_url ?? input.hinhAnh ?? input.hinhanh ?? input.hinh_anh ?? input.hinh;
  if (!raw) return [];
  const values = Array.isArray(raw) ? raw : String(raw).split(/\n/);
  return values.map((value) => String(value).trim()).filter(Boolean);
}

function appendImagesToPrompt(prompt, images) {
  if (!images.length) return prompt;
  return `${prompt.trim()}\n\n${images.map((url, index) => `![Hình ${index + 1}](${url})`).join("\n")}`;
}

function normalizeQuestionInput(input, index) {
  const prompt = pickField(input, ["prompt", "question", "content", "noiDung", "noi_dung", "cauHoi", "cau_hoi", "Câu hỏi", "Nội dung"]);
  const rawOptions = Array.isArray(input.options)
    ? input.options
    : ["A", "B", "C", "D", "E", "F"].map((label) => (
      input[label] ?? input[label.toLowerCase()] ?? input[`option${label}`] ?? input[`option_${label.toLowerCase()}`]
    )).filter((value) => value !== undefined && value !== null && String(value).trim());
  const options = rawOptions.map((value) => String(value).trim()).filter(Boolean);
  const explanation = pickField(input, ["explanation", "explain", "solution", "giaiThich", "giai_thich", "Giải thích"]);
  const images = normalizeImageList(input);
  const points = Number(pickField(input, ["points", "point", "score", "diem", "Điểm"]) || 1);
  const rawCorrect = input.correctIndex ?? input.correct ?? input.answer ?? input.correctAnswer ?? input.dapAn ?? input.dap_an ?? input["Đáp án"];
  let correct = "";

  if (typeof rawCorrect === "number" && Number.isInteger(rawCorrect)) {
    correct = answerLabel(rawCorrect);
  } else if (rawCorrect !== undefined && rawCorrect !== null) {
    const text = String(rawCorrect).trim();
    const letter = text.match(/[A-F]/i)?.[0]?.toUpperCase();
    const byContent = options.findIndex((option) => normalizeText(option) === normalizeText(text));
    correct = byContent >= 0 ? answerLabel(byContent) : (/^\d+$/.test(text) ? answerLabel(Number(text)) : (letter || ""));
  }

  if (!prompt) throw new Error(`Câu ${index} chưa có nội dung.`);
  if (options.length < 2) throw new Error(`Câu ${index} cần ít nhất 2 phương án.`);
  if (options.length > 6) throw new Error(`Câu ${index} đang có quá 6 phương án.`);
  if (!correct || !options[correct.charCodeAt(0) - 65]) throw new Error(`Câu ${index} chưa có đáp án đúng hợp lệ.`);

  return {
    prompt: appendImagesToPrompt(prompt, images),
    answers: options.map((content, optionIndex) => ({ label: answerLabel(optionIndex), content })),
    correct,
    explanation,
    points: Number.isFinite(points) && points > 0 ? points : 1,
  };
}

function parseDelimitedQuestions(raw, delimiter) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("File CSV/TSV cần có dòng tiêu đề và ít nhất 1 câu hỏi.");
  const headers = parseCsvLine(lines[0], delimiter);
  const keys = headers.map((header) => {
    const normalized = normalizeHeader(header);
    if (["cauhoi", "question", "prompt", "noidung", "content"].includes(normalized)) return "prompt";
    if (["dapan", "answer", "correct", "correctanswer"].includes(normalized)) return "correct";
    if (["giaithich", "explanation", "explain", "solution"].includes(normalized)) return "explanation";
    if (["diem", "points", "point", "score"].includes(normalized)) return "points";
    if (["image", "images", "imageurl", "hinhanh", "hinh"].includes(normalized)) return "image";
    if (/^[a-f]$/.test(normalized)) return normalized.toUpperCase();
    return normalized;
  });
  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line, delimiter);
    const record = {};
    keys.forEach((key, cellIndex) => {
      record[key] = cells[cellIndex] ?? "";
    });
    return normalizeQuestionInput(record, index + 1);
  });
}

function splitPlainTextBlocks(raw) {
  const text = raw.replace(/\r\n/g, "\n").trim();
  let blocks = text.split(/\n\s*\n+/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length <= 1) {
    const nextBlocks = [];
    let current = [];
    for (const line of text.split("\n")) {
      if (/^\s*(câu|cau|q)\s*\d+/i.test(line) && current.length) {
        nextBlocks.push(current.join("\n").trim());
        current = [];
      }
      current.push(line);
    }
    if (current.length) nextBlocks.push(current.join("\n").trim());
    blocks = nextBlocks.filter(Boolean);
  }
  return blocks;
}

function parsePlainTextQuestions(raw) {
  return splitPlainTextBlocks(raw).map((block, blockIndex) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const record = {};
    const prompt = [];
    const explanation = [];
    let readingExplanation = false;

    for (const line of lines) {
      const optionMatch = line.match(/^([A-Fa-f])[\.\)]\s*(.+)$/);
      const correctMatch = line.match(/^(đáp án|dap an|answer|correct)\s*[:\-]\s*([A-Fa-f]|\d+)/i);
      const explanationMatch = line.match(/^(giải thích|giai thich|explanation|solution)\s*[:\-]\s*(.*)$/i);
      const imageMatch = line.match(/^(ảnh|anh|hình|hinh|image)\s*[:\-]\s*(.+)$/i);
      if (optionMatch) {
        record[optionMatch[1].toUpperCase()] = optionMatch[2].trim();
        readingExplanation = false;
        continue;
      }
      if (imageMatch) {
        record.images = [...(record.images || []), imageMatch[2].trim()];
        readingExplanation = false;
        continue;
      }
      if (correctMatch) {
        record.correct = correctMatch[2].trim();
        readingExplanation = false;
        continue;
      }
      if (explanationMatch) {
        readingExplanation = true;
        if (explanationMatch[2]) explanation.push(explanationMatch[2].trim());
        continue;
      }
      if (readingExplanation) explanation.push(line);
      else prompt.push(line);
    }

    record.prompt = prompt.join("\n").replace(/^\s*(câu|cau|q)\s*\d+\s*[:\.\)]?\s*/i, "").trim();
    record.explanation = explanation.join("\n").trim();
    return normalizeQuestionInput(record, blockIndex + 1);
  });
}

function parseQuestionsFromImport(raw) {
  const content = String(raw || "").trim();
  if (!content) return [];
  if (content.startsWith("{") || content.startsWith("[")) {
    const parsed = JSON.parse(content);
    const items = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(items)) throw new Error("JSON cần là mảng câu hỏi hoặc object có trường questions.");
    return items.map((item, index) => normalizeQuestionInput(item, index + 1));
  }
  if (content.includes("\t")) return parseDelimitedQuestions(content, "\t");
  const firstLine = content.split(/\r?\n/)[0] || "";
  if (firstLine.includes(",") && /question|prompt|câu|cau|A|B|correct|đáp|dap/i.test(firstLine)) {
    return parseDelimitedQuestions(content, ",");
  }
  return parsePlainTextQuestions(content);
}

function toQuestionCreate(question, index) {
  return {
    position: index + 1,
    type: "SINGLE_CHOICE",
    prompt: question.prompt,
    points: question.points,
    explanation: question.explanation || null,
    answerOptions: {
      create: question.answers.map((answer) => ({
        ...answer,
        isCorrect: answer.label === question.correct,
      })),
    },
  };
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function examContentModeLabel(value) {
  if (value === "topics") return "Theo Chuyên đề";
  if (value === "exams") return "Theo Kì thi";
  if (value === "theory") return "Lý thuyết";
  return "";
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function readBodyBuffer(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function readForm(req) {
  return new URLSearchParams(await readBody(req));
}

async function readMultipartForm(req) {
  const contentType = String(req.headers["content-type"] || "");
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[1] || contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[2];
  if (!boundary) throw new Error("Form tải lên không hợp lệ.");

  const body = (await readBodyBuffer(req)).toString("latin1");
  const fields = new Map();
  const files = new Map();
  for (const section of body.split(`--${boundary}`)) {
    if (!section || section === "--\r\n" || section === "--") continue;
    const normalized = section.startsWith("\r\n") ? section.slice(2) : section;
    const headerEnd = normalized.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;
    const rawHeaders = normalized.slice(0, headerEnd);
    let rawContent = normalized.slice(headerEnd + 4);
    if (rawContent.endsWith("\r\n")) rawContent = rawContent.slice(0, -2);
    if (rawContent.endsWith("--")) rawContent = rawContent.slice(0, -2);
    const disposition = rawHeaders.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || "";
    const name = disposition.match(/name="([^"]+)"/)?.[1];
    if (!name) continue;
    const filename = disposition.match(/filename="([^"]*)"/)?.[1];
    const content = Buffer.from(rawContent, "latin1");
    if (filename !== undefined && filename !== "") {
      const mimeType = rawHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() || "application/octet-stream";
      files.set(name, { filename, mimeType, buffer: content, size: content.length });
    } else {
      fields.set(name, content.toString("utf8").trim());
    }
  }
  return { fields, files };
}

function redirect(res, location) {
  res.writeHead(303, { Location: location });
  res.end();
}

function sendHtml(res, html, status = 200, headers = {}) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", ...headers });
  res.end(html);
}

function sendText(res, text, status = 200) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function currentUser(req) {
  const token = parseCookies(req)[sessionCookie];
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true } });
  return user?.role === "ADMIN" ? user : null;
}

function layout({ title, active, user, body, notice = "" }) {
  const nav = resources
    .map((item) => `<a class="${active === item.href ? "active" : ""}" href="${item.href}">${escapeHtml(item.label)}</a>`)
    .join("");

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | Ava Admin</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap');
    :root { color-scheme: light; --ink:#071025; --muted:#667085; --line:#fee1c8; --orange:#f97316; --bg:#fff8ee; }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Be Vietnam Pro", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--ink); }
    a { color: inherit; text-decoration: none; }
    .shell { min-height: 100vh; display:grid; grid-template-columns: 280px 1fr; }
    aside { position: sticky; top:0; height:100vh; padding:24px; border-right:1px solid var(--line); background:#fff; display:flex; flex-direction:column; }
    .brand { display:flex; align-items:center; gap:12px; font-weight:950; font-size:22px; }
    .brand-mark { display:grid; place-items:center; width:44px; height:44px; border-radius:16px; background:#fff1e7; color:var(--orange); }
    nav { margin-top:28px; display:grid; gap:8px; overflow-y:auto; padding-bottom:12px; }
    nav a { padding:13px 14px; border-radius:14px; font-weight:850; color:#475467; }
    nav a.active, nav a:hover { background:#fff1e7; color:#ea580c; }
    .userbox { margin-top:auto; padding:14px; border-radius:18px; background:#f8fafc; border:1px solid #eef2f7; }
    .main { padding:30px; }
    .topbar { display:flex; justify-content:space-between; align-items:flex-start; gap:18px; margin-bottom:24px; }
    h1 { margin:0; font-size:34px; letter-spacing:-.02em; }
    .subtitle { margin-top:8px; color:var(--muted); font-weight:650; }
    .button, button { border:0; border-radius:14px; background:var(--orange); color:#fff; padding:12px 16px; font-weight:900; cursor:pointer; }
    .button.secondary, button.secondary { background:#f1f5f9; color:#334155; }
    .button.danger, button.danger { background:#ef4444; }
    .grid { display:grid; gap:16px; }
    .stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .card { background:#fff; border:1px solid var(--line); border-radius:22px; padding:20px; box-shadow:0 14px 40px rgba(72,48,26,.05); }
    .stat-label { color:var(--muted); font-weight:850; font-size:12px; text-transform:uppercase; }
    .stat-value { margin-top:8px; font-size:32px; font-weight:950; }
    table { width:100%; border-collapse:collapse; overflow:hidden; border-radius:18px; background:#fff; }
    th, td { padding:14px 16px; text-align:left; border-bottom:1px solid #f1f5f9; vertical-align:top; }
    th { color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:.04em; background:#fffaf4; }
    td { color:#1f2937; font-weight:650; }
    .row-actions { white-space:nowrap; }
    .form { display:grid; gap:12px; }
    input, select, textarea { width:100%; border:1px solid #e5e7eb; border-radius:14px; padding:12px 13px; font:inherit; font-weight:650; outline:none; }
    input:focus, select:focus, textarea:focus { border-color:var(--orange); box-shadow:0 0 0 3px rgba(249,115,22,.12); }
    label { display:grid; gap:7px; color:#475467; font-size:13px; font-weight:850; }
    .filters { display:grid; grid-template-columns: minmax(260px, 1fr) 180px auto auto; gap:12px; align-items:end; margin-bottom:16px; }
    .inline-form { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
    .inline-form input, .inline-form select { width:auto; min-width:84px; padding:9px 10px; border-radius:12px; }
    .inline-form button { padding:9px 12px; border-radius:12px; }
    .action-stack { display:flex; flex-direction:column; align-items:flex-start; gap:10px; }
    .action-stack .inline-form select { max-width:180px; }
    .exam-create-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:14px; }
    .exam-create-grid .wide { grid-column: 1 / -1; }
    .creation-panels { display:grid; grid-template-columns: minmax(0, 1fr) minmax(360px, .82fr); gap:16px; align-items:start; }
    .helper-card { border:1px solid #e2e8f0; border-radius:18px; background:#f8fafc; padding:16px; }
    .exam-create-grid > .helper-card { grid-column: 1 / -1; }
    .helper-card h2 { margin:0 0 8px; font-size:18px; }
    .template-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
    .template-actions button { padding:9px 11px; border-radius:12px; background:#0f172a; }
    .mode-tabs { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:10px; border:1px solid #fed7aa; border-radius:22px; background:#fff7ed; padding:8px; }
    .mode-tab { display:flex; align-items:center; justify-content:center; gap:8px; border-radius:18px; background:transparent; color:#64748b; padding:14px 12px; font-weight:950; }
    .mode-tab.active { background:var(--orange); color:#fff; box-shadow:0 12px 28px rgba(249,115,22,.22); }
    .mode-note { margin-top:10px; border-radius:16px; background:#f8fafc; border:1px solid #e2e8f0; padding:12px 14px; color:#475467; font-size:13px; font-weight:750; line-height:1.6; }
    .formula-kit { display:grid; gap:8px; margin-top:10px; }
    .formula-chip { display:block; border-radius:12px; background:#fff; border:1px solid #e2e8f0; padding:9px 10px; color:#1e293b; font-weight:800; }
    .file-strip { display:grid; gap:8px; border:1px dashed #fdba74; border-radius:16px; background:#fff7ed; padding:12px; }
    .bulk-textarea { min-height:360px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size:13px; line-height:1.55; }
    .preview-panel { margin-top:14px; display:grid; gap:12px; }
    .preview-question { border:1px solid #e2e8f0; border-radius:18px; background:#fff; padding:16px; }
    .preview-question h3 { margin:0 0 10px; font-size:18px; }
    .preview-options { display:grid; gap:8px; margin-top:12px; }
    .preview-option { display:flex; gap:10px; align-items:flex-start; border:1px solid #e5e7eb; border-radius:14px; padding:10px 12px; background:#fff; }
    .preview-option strong { display:grid; place-items:center; width:32px; height:32px; border-radius:999px; background:#f1f5f9; color:#334155; flex:0 0 auto; }
    .preview-text { white-space:pre-wrap; line-height:1.7; color:#1f2937; font-weight:700; }
    .preview-text .katex { font-size:1.08em; }
    .math-fallback { display:inline-flex; border-radius:8px; background:#eff6ff; padding:1px 5px; color:#1d4ed8; font-family:ui-monospace, SFMono-Regular, Consolas, monospace; }
    .preview-image { display:block; max-width:min(100%, 560px); max-height:320px; margin-top:10px; border-radius:14px; border:1px solid #e2e8f0; object-fit:contain; background:#f8fafc; }
    .preview-error { border:1px solid #fecaca; background:#fff1f2; color:#b91c1c; border-radius:14px; padding:12px; font-weight:850; }
    .question-box { border:1px solid #eef2f7; background:#fffaf4; border-radius:18px; padding:16px; }
    .question-title { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; font-weight:950; }
    .answer-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; }
    .user-title { font-weight:950; }
    .nowrap { white-space:nowrap; }
    .metric-list { display:grid; gap:5px; color:#475467; font-size:13px; font-weight:750; }
    .mini-note { margin-top:6px; color:#94a3b8; font-size:12px; font-weight:750; }
    .thumb { width:120px; height:76px; object-fit:cover; border-radius:14px; border:1px solid #e2e8f0; background:#f8fafc; }
    .notice { margin-bottom:18px; padding:14px 16px; border-radius:16px; background:#ecfdf3; color:#047857; font-weight:850; }
    .pill { display:inline-flex; align-items:center; border-radius:999px; padding:6px 10px; background:#f1f5f9; color:#475467; font-size:12px; font-weight:900; }
    .detail-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px; }
    .detail-item { border:1px solid #eef2f7; border-radius:16px; padding:14px; background:#fffaf4; }
    .detail-item span { display:block; color:#64748b; font-size:12px; font-weight:900; text-transform:uppercase; }
    .detail-item strong { display:block; margin-top:6px; font-size:16px; }
    .file-preview { width:100%; min-height:72vh; border:1px solid #e2e8f0; border-radius:18px; background:#f8fafc; }
    .two { grid-template-columns: 390px 1fr; align-items:start; }
    .muted { color:var(--muted); }
    @media (max-width: 980px) {
      .shell { grid-template-columns:1fr; }
      aside { position:relative; height:auto; }
      .userbox { position:relative; left:auto; right:auto; bottom:auto; margin-top:20px; }
      .stats, .two, .filters, .exam-create-grid, .answer-grid, .creation-panels, .detail-grid, .mode-tabs { grid-template-columns:1fr; }
      .exam-create-grid .wide { grid-column:auto; }
      .main { padding:20px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <a class="brand" href="/"><span class="brand-mark">A</span><span>Ava Admin</span></a>
      <nav>${nav}</nav>
      <div class="userbox">
        <strong>${escapeHtml(user?.name || "Admin")}</strong>
        <div class="muted" style="margin-top:4px;font-size:13px">${escapeHtml(user?.email || "")}</div>
        <form method="post" action="/logout" style="margin-top:12px"><button class="secondary" type="submit">Đăng xuất</button></form>
      </div>
    </aside>
    <main class="main">
      ${notice ? `<div class="notice">${escapeHtml(notice)}</div>` : ""}
      ${body}
    </main>
  </div>
</body>
</html>`;
}

function loginPage(error = "") {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Đăng nhập Admin | Ava</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap');
    body { margin:0; min-height:100vh; display:grid; place-items:center; background:#071025; color:#fff; font-family:"Be Vietnam Pro", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    form { width:min(430px, calc(100vw - 32px)); border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.08); border-radius:28px; padding:32px; box-shadow:0 30px 80px rgba(0,0,0,.32); }
    h1 { margin:0; font-size:34px; }
    p { color:#cbd5e1; line-height:1.6; }
    label { display:grid; gap:8px; margin-top:16px; font-weight:850; color:#e2e8f0; }
    input { border:0; border-radius:16px; padding:14px 15px; font:inherit; font-weight:700; }
    button { margin-top:20px; width:100%; border:0; border-radius:16px; padding:14px 16px; background:#f97316; color:#fff; font:inherit; font-weight:950; cursor:pointer; }
    .error { background:#fee2e2; color:#991b1b; border-radius:16px; padding:12px 14px; font-weight:850; }
    .demo { background:rgba(0,0,0,.22); border-radius:16px; padding:12px 14px; }
  </style>
</head>
<body>
  <form method="post" action="/login">
    <h1>Ava Admin</h1>
    <p>Đăng nhập để quản trị web Ava trên server riêng.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    ${process.env.CODESPACE_NAME && process.env.NODE_ENV !== "production" && process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD
      ? `<p class="demo">Tài khoản admin Codespaces: <strong>${escapeHtml(process.env.SEED_ADMIN_EMAIL)}</strong> / <strong>${escapeHtml(process.env.SEED_ADMIN_PASSWORD)}</strong></p>`
      : `<p class="demo">Đăng nhập bằng tài khoản admin đã được cấu hình cho môi trường này.</p>`}
    <label>Email admin<input name="email" type="email" required autofocus /></label>
    <label>Mật khẩu<input name="password" type="password" required /></label>
    <button type="submit">Đăng nhập admin</button>
  </form>
</body>
</html>`;
}

function pageHeader(title, subtitle, action = "") {
  return `<div class="topbar"><div><h1>${escapeHtml(title)}</h1><div class="subtitle">${escapeHtml(subtitle)}</div></div>${action}</div>`;
}

function table(headers, rows) {
  return `<div class="card" style="padding:0;overflow:auto"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${headers.length}" class="muted">Chưa có dữ liệu.</td></tr>`}</tbody></table></div>`;
}

function row(cells) {
  return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
}

function badge(value) {
  return `<span class="pill">${escapeHtml(value)}</span>`;
}

function roleLabel(role) {
  if (role === "ADMIN") return "Quản trị";
  if (role === "TEACHER") return "Giáo viên";
  return "Học sinh";
}

function activeSubscription(user, now = new Date()) {
  return (user.subscriptions || []).find((subscription) => subscription.status === "ACTIVE" && new Date(subscription.endsAt) > now);
}

function attemptStats(attempts = []) {
  const submitted = attempts.filter((attempt) => attempt.status === "SUBMITTED" && Number(attempt.maxScore) > 0);
  const scores = submitted.map((attempt) => (Number(attempt.score || 0) / Number(attempt.maxScore)) * 10);
  const total = scores.reduce((sum, score) => sum + score, 0);
  return {
    count: submitted.length,
    average: scores.length ? total / scores.length : null,
    best: scores.length ? Math.max(...scores) : null,
    latest: submitted[0]?.submittedAt || null,
  };
}

function scoreText(value) {
  return value === null || value === undefined ? "-" : Number(value).toFixed(2);
}

function profileSummary(profile) {
  if (!profile) return `<span class="muted">Chưa khai báo</span>`;
  const lines = [
    profile.grade ? `Lớp/khối: ${profile.grade}` : "",
    profile.school ? `Trường: ${profile.school}` : "",
    profile.province ? `Tỉnh/TP: ${profile.province}` : "",
    profile.aspiration ? `Trường ĐH mong muốn: ${profile.aspiration}` : "",
    profile.targetScore ? `Mục tiêu: ${profile.targetScore}` : "",
  ].filter(Boolean);
  return lines.length
    ? `<div class="metric-list">${lines.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}</div>`
    : `<span class="muted">Chưa khai báo</span>`;
}

function usersExcelRows(users, now = new Date()) {
  return users.map((item) => {
    const profile = item.profile || {};
    const stats = attemptStats(item.attempts);
    const vip = activeSubscription(item, now);
    const paidTotal = (item.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return {
      ID: item.id,
      Email: item.email,
      "Tên người dùng": item.name || "",
      "Vai trò": roleLabel(item.role),
      VIP: vip ? "Có" : "Không",
      "Gói VIP": vip?.plan?.name || "",
      "VIP hết hạn": vip ? formatDate(vip.endsAt) : "",
      "Lớp/khối": profile.grade || "",
      Trường: profile.school || "",
      "Tỉnh/Thành": profile.province || "",
      "Trường đại học mong muốn": profile.aspiration || "",
      "Mục tiêu điểm": profile.targetScore || "",
      "Nguồn biết web": profile.source || "",
      "Số bài đã nộp": stats.count,
      "Điểm trung bình (hệ 10)": stats.average === null ? "" : Number(stats.average.toFixed(2)),
      "Điểm cao nhất (hệ 10)": stats.best === null ? "" : Number(stats.best.toFixed(2)),
      "Lần làm gần nhất": stats.latest ? formatDate(stats.latest) : "",
      "Tài liệu đã tải lên": item._count?.documents || 0,
      "Vật phẩm đã mua": item._count?.storePurchases || 0,
      "Tổng thanh toán đã trả": paidTotal,
      "Ngày tạo": formatDate(item.createdAt),
      "Cập nhật": formatDate(item.updatedAt),
    };
  });
}

function desiredUniversityStats(profiles = []) {
  const stats = new Map();
  for (const profile of profiles) {
    const university = String(profile.aspiration || "").trim();
    if (!university) continue;
    const key = university.toLocaleLowerCase("vi");
    const entry = stats.get(key) || { university, count: 0, students: [] };
    entry.count += 1;
    if (entry.students.length < 6) {
      entry.students.push(profile.user?.name || profile.user?.email || "Chưa đặt tên");
    }
    stats.set(key, entry);
  }
  return [...stats.values()].sort((first, second) => second.count - first.count || first.university.localeCompare(second.university, "vi")).slice(0, 12);
}

function selected(value, current) {
  return value === current ? " selected" : "";
}

function checked(value, current) {
  return value === current ? " checked" : "";
}

function defaultAnnouncementConfig() {
  return {
    banner: {
      enabled: true,
      type: "exam",
      title: "Lịch thi mới",
      message: "Theo dõi các đề ôn tập và thư mục tài liệu chung mới nhất.",
      href: "/documents",
      updatedAt: new Date().toISOString(),
    },
    history: [],
  };
}

function readAnnouncementConfig() {
  try {
    if (!fs.existsSync(announcementConfigPath)) return defaultAnnouncementConfig();
    const parsed = JSON.parse(fs.readFileSync(announcementConfigPath, "utf8"));
    return { ...defaultAnnouncementConfig(), ...parsed, banner: { ...defaultAnnouncementConfig().banner, ...(parsed.banner || {}) } };
  } catch {
    return defaultAnnouncementConfig();
  }
}

function writeAnnouncementConfig(config) {
  fs.mkdirSync(adminDataDir, { recursive: true });
  fs.writeFileSync(announcementConfigPath, JSON.stringify(config, null, 2), "utf8");
}

function defaultDashboardContentConfig() {
  const now = new Date().toISOString();
  return {
    quotes: [
      {
        id: "default-discipline",
        text: "Kỷ luật hôm nay là sự tự tin của ngày mai.",
        author: "",
        isActive: true,
        createdAt: now,
      },
    ],
    images: [],
  };
}

function normalizeDashboardContentConfig(config) {
  const fallback = defaultDashboardContentConfig();
  const quotes = Array.isArray(config?.quotes) ? config.quotes : fallback.quotes;
  const images = Array.isArray(config?.images) ? config.images : fallback.images;
  return {
    quotes: quotes.map((item) => ({
      id: String(item.id || crypto.randomUUID()),
      text: String(item.text || "").trim(),
      author: String(item.author || "").trim(),
      isActive: Boolean(item.isActive),
      createdAt: item.createdAt || new Date().toISOString(),
    })).filter((item) => item.text),
    images: images.map((item) => ({
      id: String(item.id || crypto.randomUUID()),
      title: String(item.title || "Ảnh động lực").trim(),
      alt: String(item.alt || item.title || "Ảnh động lực").trim(),
      src: String(item.src || "").trim(),
      isActive: Boolean(item.isActive),
      createdAt: item.createdAt || new Date().toISOString(),
    })).filter((item) => item.src),
  };
}

function readDashboardContentConfig() {
  try {
    if (!fs.existsSync(dashboardContentConfigPath)) return defaultDashboardContentConfig();
    return normalizeDashboardContentConfig(JSON.parse(fs.readFileSync(dashboardContentConfigPath, "utf8")));
  } catch {
    return defaultDashboardContentConfig();
  }
}

function writeDashboardContentConfig(config) {
  fs.mkdirSync(adminDataDir, { recursive: true });
  fs.writeFileSync(dashboardContentConfigPath, JSON.stringify(normalizeDashboardContentConfig(config), null, 2), "utf8");
}

function motivationImagesDirectory() {
  return path.join(process.cwd(), "public", "uploads", "motivation");
}

const motivationImageMimeTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
]);

function safeMotivationImage(filename) {
  const extension = path.extname(filename || "").toLowerCase();
  const mimeType = motivationImageMimeTypes.get(extension);
  if (!mimeType) throw new Error("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.");
  return { extension, mimeType };
}

function userFilterLink({ q, role }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role && role !== "ALL") params.set("role", role);
  const query = params.toString();
  return query ? `/users?${query}` : "/users";
}

async function dashboardPage(user, notice) {
  const [userCount, examCount, pendingDocs, pendingPayments, recentUsers, recentPayments] = await Promise.all([
    prisma.user.count(),
    prisma.exam.count(),
    prisma.document.count({ where: { status: "PENDING" } }).catch(() => 0),
    prisma.payment.count({ where: { status: "PENDING" } }).catch(() => 0),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { user: true, plan: true } }).catch(() => []),
  ]);

  const stats = [
    ["Người dùng", userCount],
    ["Đề thi", examCount],
    ["Tài liệu chờ duyệt", pendingDocs],
    ["Thanh toán chờ xử lý", pendingPayments],
  ]
    .map(([label, value]) => `<section class="card"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${formatNumber(value)}</div></section>`)
    .join("");

  const users = table(
    ["Email", "Tên", "Vai trò", "Ngày tạo"],
    recentUsers.map((item) => row([escapeHtml(item.email), escapeHtml(item.name || "-"), badge(item.role), escapeHtml(formatDate(item.createdAt))])),
  );

  const payments = table(
    ["Người dùng", "Gói", "Số tiền", "Trạng thái"],
    recentPayments.map((item) => row([escapeHtml(item.user?.email || "-"), escapeHtml(item.plan?.name || item.planId), `${formatNumber(item.amount)} VND`, badge(item.status)])),
  );

  const body = `${pageHeader("Tổng quan admin", "Server admin riêng đang kết nối trực tiếp database của web Ava.", `<a class="button" href="/users">Quản lý người dùng</a>`)}
  <div class="grid stats">${stats}</div>
  <div class="grid two" style="margin-top:18px">
    <section>${pageHeader("Người dùng mới", "5 tài khoản gần nhất")}${users}</section>
    <section>${pageHeader("Thanh toán mới", "Theo dõi kích hoạt gói thành viên")}${payments}</section>
  </div>`;
  return layout({ title: "Tổng quan", active: "/", user, notice, body });
}

async function motivationPage(user, notice) {
  const config = readDashboardContentConfig();
  const quoteRows = config.quotes.map((item) =>
    row([
      `<strong>${escapeHtml(item.text)}</strong>${item.author ? `<div class="mini-note">${escapeHtml(item.author)}</div>` : ""}`,
      item.isActive ? badge("Đang hiển thị") : `<span class="muted">Dự phòng</span>`,
      escapeHtml(formatDate(item.createdAt)),
      `<div class="inline-form">
        <form method="post" action="/motivation/quotes/${item.id}/activate">${item.isActive ? "" : `<button type="submit">Hiển thị</button>`}</form>
        <form method="post" action="/motivation/quotes/${item.id}/delete" onsubmit="return confirm('Xóa câu nói này?')"><button class="danger" type="submit">Xóa</button></form>
      </div>`,
    ]),
  );

  const imageRows = config.images.map((item) =>
    row([
      `<img class="thumb" src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" />`,
      `<strong>${escapeHtml(item.title)}</strong><div class="mini-note">${escapeHtml(item.src)}</div>`,
      item.isActive ? badge("Đang dùng") : `<span class="muted">Dự phòng</span>`,
      escapeHtml(formatDate(item.createdAt)),
      `<div class="inline-form">
        <form method="post" action="/motivation/images/${item.id}/activate">${item.isActive ? "" : `<button type="submit">Dùng ảnh</button>`}</form>
        <form method="post" action="/motivation/images/${item.id}/delete" onsubmit="return confirm('Xóa ảnh này?')"><button class="danger" type="submit">Xóa</button></form>
      </div>`,
    ]),
  );

  const body = `${pageHeader("Động lực dashboard", "Quản lý câu nói cổ vũ và ảnh mặc định hiển thị ở dashboard học sinh.")}
    <div class="grid two">
      <section class="card">
        <h1 style="font-size:24px">Thêm câu nói cổ vũ</h1>
        <form class="form" method="post" action="/motivation/quotes/create" style="margin-top:14px">
          <label>Nội dung câu nói
            <textarea name="text" rows="4" required placeholder="Ví dụ: Mỗi ngày tiến một chút, bạn sẽ đi xa hơn mình tưởng."></textarea>
          </label>
          <label>Tác giả / ghi chú
            <input name="author" placeholder="Có thể bỏ trống" />
          </label>
          <label style="display:flex;align-items:center;gap:10px">
            <input name="isActive" value="true" type="checkbox" style="width:auto" />
            Hiển thị ngay câu này trên web
          </label>
          <button type="submit">Thêm câu nói</button>
        </form>
      </section>
      <section class="card">
        <h1 style="font-size:24px">Tải ảnh động lực</h1>
        <form class="form" method="post" action="/motivation/images/upload" enctype="multipart/form-data" style="margin-top:14px">
          <label>Tên ảnh
            <input name="title" required placeholder="Ví dụ: Góc học tập tháng 7" />
          </label>
          <label>Mô tả ảnh
            <input name="alt" placeholder="Mô tả ngắn cho ảnh" />
          </label>
          <label>File ảnh
            <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required />
          </label>
          <label style="display:flex;align-items:center;gap:10px">
            <input name="isActive" value="true" type="checkbox" style="width:auto" />
            Dùng ảnh này làm ảnh mặc định
          </label>
          <button type="submit">Tải ảnh lên</button>
        </form>
      </section>
    </div>
    <div style="margin-top:18px">${pageHeader("Danh sách câu nói", "Chọn một câu để hiển thị ở thẻ chào mừng.")}${table(["Câu nói", "Trạng thái", "Ngày tạo", "Thao tác"], quoteRows)}</div>
    <div style="margin-top:18px">${pageHeader("Danh sách ảnh", "Ảnh đang dùng sẽ thay ảnh mặc định khi học sinh chưa tự trang bị ảnh riêng.")}${table(["Ảnh", "Thông tin", "Trạng thái", "Ngày tạo", "Thao tác"], imageRows)}</div>`;
  return layout({ title: "Động lực", active: "/motivation", user, notice, body });
}

async function usersPage(user, notice, url) {
  const q = String(url.searchParams.get("q") || "").trim();
  const role = String(url.searchParams.get("role") || "ALL");
  const roleFilter = ["STUDENT", "TEACHER", "ADMIN"].includes(role) ? role : "";
  const whereParts = [];

  if (q) {
    whereParts.push({
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (roleFilter) whereParts.push({ role: roleFilter });

  const where = whereParts.length ? { AND: whereParts } : {};
  const [users, totalUsers, studentCount, teacherCount, adminCount, filteredCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        _count: {
          select: {
            attempts: true,
            documents: true,
            payments: true,
            storePurchases: true,
            subscriptions: true,
          },
        },
      },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where }),
  ]);

  const statCards = [
    ["Tổng tài khoản", totalUsers],
    ["Học sinh", studentCount],
    ["Giáo viên", teacherCount],
    ["Quản trị", adminCount],
  ]
    .map(([label, value]) => `<section class="card"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${formatNumber(value)}</div></section>`)
    .join("");

  const filters = `<form class="card filters" method="get" action="/users">
    <label>Tìm kiếm tài khoản
      <input name="q" value="${escapeHtml(q)}" placeholder="Email hoặc tên người dùng" />
    </label>
    <label>Vai trò
      <select name="role">
        <option value="ALL"${selected(role, "ALL")}>Tất cả</option>
        <option value="STUDENT"${selected(role, "STUDENT")}>Học sinh</option>
        <option value="TEACHER"${selected(role, "TEACHER")}>Giáo viên</option>
        <option value="ADMIN"${selected(role, "ADMIN")}>Quản trị</option>
      </select>
    </label>
    <button type="submit">Lọc</button>
    <a class="button secondary" href="/users">Xóa lọc</a>
  </form>`;

  const rows = users.map((item) =>
    row([
      `<div class="user-title">${escapeHtml(item.email)}</div><div class="mini-note">${escapeHtml(item.name || "Chưa đặt tên")}</div>`,
      `<form class="inline-form" method="post" action="/users/${item.id}/role">
        <select name="role" aria-label="Vai trò">
          <option value="STUDENT"${selected(item.role, "STUDENT")}>Học sinh</option>
          <option value="TEACHER"${selected(item.role, "TEACHER")}>Giáo viên</option>
          <option value="ADMIN"${selected(item.role, "ADMIN")}>Quản trị</option>
        </select>
        <button type="submit">Lưu</button>
      </form>
      <div class="mini-note">Hiện tại: ${escapeHtml(roleLabel(item.role))}</div>`,
      `<form class="inline-form" method="post" action="/users/${item.id}/balance">
        <input name="coins" type="number" min="0" value="${Number(item.coins || 0)}" aria-label="Coin" />
        <input name="exp" type="number" min="0" value="${Number(item.exp || 0)}" aria-label="EXP" />
        <button type="submit">Cập nhật</button>
      </form>
      <div class="mini-note">Coin / EXP</div>`,
      `<div class="metric-list">
        <span>${formatNumber(item._count.attempts)} lượt làm bài</span>
        <span>${formatNumber(item._count.documents)} tài liệu</span>
        <span>${formatNumber(item._count.payments)} thanh toán</span>
        <span>${formatNumber(item._count.storePurchases)} vật phẩm</span>
      </div>`,
      `<span class="nowrap">${escapeHtml(formatDate(item.createdAt))}</span>`,
      item.id === user.id
        ? `<span class="muted">Dang dang nhap</span>`
        : `<form method="post" action="/users/${item.id}/delete" onsubmit="return confirm('Xoa tai khoan nay?')"><button class="danger" type="submit">Xoa</button></form>`,
    ]),
  );

  const body = `${pageHeader("Người dùng", "Theo dõi tài khoản, vai trò, điểm thưởng và hoạt động liên quan trên web.")}
    <div class="grid stats">${statCards}</div>
    <div style="margin-top:16px">${filters}</div>
    <div class="subtitle" style="margin-bottom:12px">Đang hiển thị ${formatNumber(filteredCount)} tài khoản${q || roleFilter ? ` theo bộ lọc hiện tại` : ""}.</div>
    ${table(["Tài khoản", "Vai trò", "Coin / EXP", "Hoạt động", "Ngày tạo", "Thao tác"], rows)}`;
  return layout({ title: "Người dùng", active: "/users", user, notice, body });
}

async function usersPage(user, notice, url) {
  const q = String(url.searchParams.get("q") || "").trim();
  const role = String(url.searchParams.get("role") || "ALL");
  const roleFilter = ["STUDENT", "TEACHER", "ADMIN"].includes(role) ? role : "";
  const whereParts = [];

  if (q) {
    whereParts.push({
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (roleFilter) whereParts.push({ role: roleFilter });

  const where = whereParts.length ? { AND: whereParts } : {};
  const now = new Date();
  const [users, universityProfiles, plans, totalUsers, studentCount, teacherCount, adminCount, vipCount, filteredCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        profile: true,
        attempts: {
          where: { status: "SUBMITTED" },
          orderBy: { submittedAt: "desc" },
          select: {
            status: true,
            score: true,
            maxScore: true,
            submittedAt: true,
            exam: { select: { title: true } },
          },
        },
        payments: {
          where: { status: "PAID" },
          select: { amount: true },
        },
        subscriptions: {
          where: { status: "ACTIVE", endsAt: { gt: now } },
          orderBy: { endsAt: "desc" },
          take: 1,
          include: { plan: true },
        },
        _count: { select: { documents: true, storePurchases: true } },
      },
    }),
    prisma.studentProfile.findMany({
      where: { aspiration: { not: null } },
      select: {
        aspiration: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { subscriptions: { some: { status: "ACTIVE", endsAt: { gt: now } } } } }),
    prisma.user.count({ where }),
  ]);

  const statCards = [
    ["Tổng tài khoản", totalUsers],
    ["Học sinh", studentCount],
    ["Giáo viên", teacherCount],
    ["VIP đang hoạt động", vipCount],
  ]
    .map(([label, value]) => `<section class="card"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${formatNumber(value)}</div></section>`)
    .join("");

  const filters = `<form class="card filters" method="get" action="/users">
    <label>Tìm kiếm tài khoản
      <input name="q" value="${escapeHtml(q)}" placeholder="Email hoặc tên người dùng" />
    </label>
    <label>Vai trò
      <select name="role">
        <option value="ALL"${selected(role, "ALL")}>Tất cả</option>
        <option value="STUDENT"${selected(role, "STUDENT")}>Học sinh</option>
        <option value="TEACHER"${selected(role, "TEACHER")}>Giáo viên</option>
        <option value="ADMIN"${selected(role, "ADMIN")}>Quản trị</option>
      </select>
    </label>
    <button type="submit">Lọc</button>
    <a class="button secondary" href="/users">Xóa lọc</a>
  </form>`;

  const planOptions = plans.map((plan) => `<option value="${escapeHtml(plan.id)}">${escapeHtml(plan.name)} - ${formatNumber(plan.price)} VND</option>`).join("");
  const rows = users.map((item) => {
    const activeVip = activeSubscription(item, now);
    const vipText = activeVip
      ? `<strong>VIP</strong><div class="mini-note">${escapeHtml(activeVip.plan?.name || "Gói VIP")} đến ${escapeHtml(formatDate(activeVip.endsAt))}</div>`
      : `<span class="muted">Chưa VIP</span>`;
    const vipAction = planOptions
      ? `<form class="inline-form" method="post" action="/users/${item.id}/vip">
          <select name="planId" aria-label="Chọn gói VIP">${planOptions}</select>
          <button type="submit">Nâng VIP</button>
        </form>`
      : `<span class="muted">Chưa có gói VIP đang bán</span>`;
    return row([
      `<div class="user-title">${escapeHtml(item.name || "Chưa đặt tên")}</div><div class="mini-note">${escapeHtml(item.email)}</div>`,
      profileSummary(item.profile),
      badge(roleLabel(item.role)),
      vipText,
      `<span class="nowrap">${escapeHtml(formatDate(item.createdAt))}</span>`,
      `<div class="action-stack">
        ${vipAction}
        ${item.id === user.id
          ? `<span class="muted">?ang ??ng nh?p</span>`
          : `<form method="post" action="/users/${item.id}/delete" onsubmit="return confirm('X?a t?i kho?n n?y?')"><button class="danger" type="submit">X?a</button></form>`}
      </div>`,
    ]);
  });

  const universityRows = desiredUniversityStats(universityProfiles).map((item, index) =>
    row([
      `<strong>#${index + 1}</strong>`,
      `<strong>${escapeHtml(item.university)}</strong><div class="mini-note">${escapeHtml(item.students.join(", "))}</div>`,
      `${formatNumber(item.count)} học sinh`,
    ]),
  );
  const universityStatsBlock = `<div style="margin-top:18px">
    ${pageHeader("Thống kê trường đại học mong muốn", "Top trường được học sinh nhập nhiều nhất trong hồ sơ.")}
    ${table(["Hạng", "Trường đại học", "Số lượng"], universityRows)}
  </div>`;

  const body = `${pageHeader("Người dùng", "Xem toàn bộ tài khoản, hồ sơ cá nhân, VIP và thống kê học tập.", `<a class="button" href="/users/export.xlsx">Xuất Excel</a>`)}
    <div class="grid stats">${statCards}</div>
    <div style="margin-top:16px">${filters}</div>
    ${universityStatsBlock}
    <div class="subtitle" style="margin-bottom:12px">Đang hiển thị ${formatNumber(filteredCount)} tài khoản${q || roleFilter ? ` theo bộ lọc hiện tại` : ""}.</div>
    ${table(["Tên tài khoản / Gmail", "Thông tin cá nhân", "Vai trò", "VIP", "Ngày tạo", "Thao tác"], rows)}`;
  return layout({ title: "Người dùng", active: "/users", user, notice, body });
}

async function exportUsersExcel(res) {
  const now = new Date();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      profile: true,
      attempts: {
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        select: {
          status: true,
          score: true,
          maxScore: true,
          submittedAt: true,
        },
      },
      payments: {
        where: { status: "PAID" },
        select: { amount: true },
      },
      subscriptions: {
        where: { status: "ACTIVE", endsAt: { gt: now } },
        orderBy: { endsAt: "desc" },
        include: { plan: true },
      },
      _count: { select: { documents: true, storePurchases: true } },
    },
  });
  const rows = usersExcelRows(users, now);
  const headers = [
    "ID",
    "Email",
    "Tên người dùng",
    "Vai trò",
    "VIP",
    "Gói VIP",
    "VIP hết hạn",
    "Lớp/khối",
    "Trường",
    "Tỉnh/Thành",
    "Trường đại học mong muốn",
    "Mục tiêu điểm",
    "Nguồn biết web",
    "Số bài đã nộp",
    "Điểm trung bình (hệ 10)",
    "Điểm cao nhất (hệ 10)",
    "Lần làm gần nhất",
    "Tài liệu đã tải lên",
    "Vật phẩm đã mua",
    "Tổng thanh toán đã trả",
    "Ngày tạo",
    "Cập nhật",
  ];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  worksheet["!cols"] = headers.map((header) => ({ wch: Math.min(34, Math.max(12, header.length + 4)) }));
  XLSX.utils.book_append_sheet(workbook, worksheet, "Nguoi dung");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  res.writeHead(200, {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="ava-users-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    "Content-Length": buffer.length,
    "Cache-Control": "no-store",
  });
  res.end(buffer);
}

function examCreateForm(subjects) {
  const subjectOptions = subjects.map((subject) => {
    return `<option value="${escapeHtml(subject.id)}" data-name="${escapeHtml(normalizeText(subject.name))}">${escapeHtml(subject.name)}</option>`;
  }).join("");
  const flowJson = JSON.stringify(studyFlows.map((flow) => ({
    id: flow.id,
    label: flow.label,
    grades: flow.grades,
    subjects: flow.subjects.map(normalizeText),
  }))).replace(/</g, "\\u003c");
  const textTemplate = `Câu 1: Tính đạo hàm của hàm số $y=x^2+3x$.
A. $2x+3$
B. $x^2+3$
C. $2x$
D. $3x$
Đáp án: A
Giải thích: $(x^2)'=2x$ và $(3x)'=3$.

Câu 2: Công thức tính lực đàn hồi là gì?
Ảnh: https://dummyimage.com/640x280/f8fafc/0f172a.png&text=Hinh+minh+hoa
A. $F=k\\Delta l$
B. $F=ma^2$
C. $A=Fs$
D. $P=UI$
Đáp án: A
Giải thích: Lực đàn hồi tuân theo định luật Hooke.`;
  const csvTemplate = `question,image,A,B,C,D,correct,explanation
"Tính $\\Delta=b^2-4ac$ khi $a=1,b=3,c=2$","","$1$","$9$","$17$","$0$",A,"$\\Delta=3^2-4\\cdot1\\cdot2=1$"
"Dung dịch có pH < 7 là môi trường nào?","https://dummyimage.com/640x280/f8fafc/0f172a.png&text=Hinh+minh+hoa","Axit","Bazơ","Trung tính","Muối",A,"pH nhỏ hơn 7 là môi trường axit."`;
  const jsonTemplate = JSON.stringify({
    questions: [
      {
        prompt: "Giải phương trình $x^2-5x+6=0$.",
        options: ["$x=2$ hoặc $x=3$", "$x=1$ hoặc $x=6$", "$x=-2$ hoặc $x=-3$", "$x=5$"],
        correct: "A",
        explanation: "$x^2-5x+6=(x-2)(x-3)$.",
      },
      {
        prompt: "Công thức tính nồng độ mol là gì?",
        image: "https://dummyimage.com/640x280/f8fafc/0f172a.png&text=Hinh+minh+hoa",
        options: ["$C_M=\\frac{n}{V}$", "$D=\\frac{m}{V}$", "$p=\\frac{F}{S}$", "$v=\\frac{s}{t}$"],
        correct: "A",
        explanation: "Nồng độ mol bằng số mol chất tan chia cho thể tích dung dịch.",
      },
    ],
  }, null, 2);
  const templateJson = JSON.stringify({ txt: textTemplate, csv: csvTemplate, json: jsonTemplate }).replace(/</g, "\\u003c");

  return `<section id="tao-de-theo-mon" class="card">
    <div class="topbar" style="margin-bottom:16px">
      <div>
        <h1 style="font-size:26px">Tạo đề theo cấp học và môn học</h1>
        <div class="subtitle">Chọn đúng luồng cấp học như màn học sinh, sau đó tạo đề bằng file TXT/CSV/JSON hoặc dán nội dung import.</div>
      </div>
    </div>
    <form class="form" method="post" action="/exams/create">
      <div class="exam-create-grid">
        <label>Cấp học
          <select name="educationLevel" id="examEducationLevel" required>
            ${optionList(studyFlows.map((flow) => ({ value: flow.id, label: flow.label })))}
          </select>
        </label>
        <label>Lớp / nhóm thi
          <select name="grade" id="examGrade" required></select>
        </label>
        <label>Môn học
          <select name="subjectId" id="examSubject" required>${subjectOptions}</select>
        </label>
        <label>Tiêu đề đề thi
          <input name="title" required placeholder="Ví dụ: Kiểm tra 15p - Đạo hàm" />
        </label>
        <label>Thời gian
          <input name="durationMinutes" type="number" min="1" value="30" required />
        </label>
        <label>Năm
          <input name="year" type="number" min="2020" value="2026" required />
        </label>
        <label class="wide">Loại nội dung
          <input type="hidden" name="contentMode" id="examContentMode" value="topics" />
          <input type="hidden" name="type" id="examType" value="PRACTICE" />
          <div class="mode-tabs" role="tablist" aria-label="Loại nội dung">
            <button class="mode-tab active" type="button" data-content-mode="topics" data-exam-type="PRACTICE">📖 Theo Chuyên đề</button>
            <button class="mode-tab" type="button" data-content-mode="exams" data-exam-type="MOCK">🗓 Theo Kì thi</button>
            <button class="mode-tab" type="button" data-content-mode="theory" data-exam-type="PRACTICE">📄 Lý thuyết</button>
          </div>
          <div class="mode-note" id="contentModeNote">Tạo bộ câu hỏi luyện tập theo chuyên đề của môn học đã chọn.</div>
        </label>
        <label>Quyền truy cập
          <select name="accessLevel">
            <option value="FREE">Miễn phí</option>
            <option value="PRO">Gói PRO</option>
          </select>
        </label>
        <label>Điểm mục tiêu
          <input name="targetScore" type="number" min="0" step="0.1" value="8" />
        </label>
        <label class="wide">Mô tả
          <textarea name="description" rows="3" placeholder="Mô tả ngắn hiển thị ở trang giới thiệu đề."></textarea>
        </label>
      </div>
      <div class="helper-card">
        <h2>Tạo nhanh từ file</h2>
        <div class="file-strip">
          <label>Chọn file .txt, .csv, .tsv hoặc .json
            <input id="examImportFile" type="file" accept=".txt,.csv,.tsv,.json,text/plain,application/json,text/csv" />
          </label>
          <label>Chèn ảnh từ máy vào câu hỏi
            <input id="questionImageFiles" type="file" accept="image/*" multiple />
          </label>
        </div>
        <div class="template-actions">
          <button type="button" data-template="txt">Mẫu TXT</button>
          <button type="button" data-template="csv">Mẫu CSV</button>
          <button type="button" data-template="json">Mẫu JSON</button>
          <button type="button" id="clearImport">Xóa import</button>
        </div>
        <label style="margin-top:12px">Nội dung import
          <textarea class="bulk-textarea" name="bulkQuestions" id="bulkQuestions" required placeholder="Dán nội dung file vào đây hoặc chọn file phía trên. Admin chỉ tạo đề bằng import, không nhập từng câu thủ công."></textarea>
        </label>
        <div class="formula-kit">
          <span class="formula-chip">$x^2+2x+1$</span>
          <span class="formula-chip">$\\Delta=b^2-4ac$</span>
          <span class="formula-chip">$F=ma$, $v=\\frac{s}{t}$</span>
          <span class="formula-chip">$H_2SO_4$, $n=\\frac{m}{M}$</span>
        </div>
        <div id="importPreview" class="preview-panel">
          <div class="muted">Bản xem trước câu hỏi và đáp án sẽ hiện ở đây sau khi bạn dán nội dung hoặc chọn file.</div>
        </div>
      </div>
      <button type="submit">Tạo đề thi</button>
    </form>
    <script>
      (() => {
        const flows = ${flowJson};
        const templates = ${templateJson};
        const level = document.getElementById("examEducationLevel");
        const grade = document.getElementById("examGrade");
        const subject = document.getElementById("examSubject");
        const importFile = document.getElementById("examImportFile");
        const imageFiles = document.getElementById("questionImageFiles");
        const bulk = document.getElementById("bulkQuestions");
        const preview = document.getElementById("importPreview");
        const contentModeInput = document.getElementById("examContentMode");
        const examTypeInput = document.getElementById("examType");
        const contentModeNote = document.getElementById("contentModeNote");
        const modeNotes = {
          topics: "Tạo bộ câu hỏi luyện tập theo chuyên đề của môn học đã chọn.",
          exams: "Tạo đề theo kì thi, kiểm tra giữa kì/cuối kì hoặc đề thi thử.",
          theory: "Tạo nội dung kiểm tra lý thuyết hoặc câu hỏi đọc hiểu lý thuyết từ file import.",
        };
        let previewTimer = 0;
        function isImageUrl(url) {
          return /^(https?:\\/\\/|data:image\\/|\\/)/i.test(url || "");
        }
        function renderMathInto(target, source) {
          const text = String(source || "");
          const mathPattern = /\\$\\$([\\s\\S]+?)\\$\\$|\\$([^$\\n]+?)\\$/g;
          let cursor = 0;
          let match;
          function addPlain(chunk) {
            if (!chunk) return;
            target.appendChild(document.createTextNode(chunk));
          }
          function addMath(expression, displayMode) {
            const span = document.createElement("span");
            if (window.katex) {
              try {
                window.katex.render(expression.trim(), span, {
                  throwOnError: false,
                  displayMode,
                  strict: "ignore",
                });
              } catch {
                span.className = "math-fallback";
                span.textContent = expression;
              }
            } else {
              span.className = "math-fallback";
              span.dataset.math = expression;
              span.dataset.display = displayMode ? "1" : "0";
              span.textContent = expression;
            }
            target.appendChild(span);
          }
          while ((match = mathPattern.exec(text))) {
            addPlain(text.slice(cursor, match.index));
            addMath(match[1] || match[2] || "", Boolean(match[1]));
            cursor = match.index + match[0].length;
          }
          addPlain(text.slice(cursor));
        }
        function rerenderFallbackMath(root = document) {
          if (!window.katex) return;
          root.querySelectorAll(".math-fallback[data-math]").forEach((node) => {
            const expression = node.dataset.math || "";
            const displayMode = node.dataset.display === "1";
            const span = document.createElement("span");
            window.katex.render(expression.trim(), span, { throwOnError: false, displayMode, strict: "ignore" });
            node.replaceWith(span);
          });
        }
        function addRichText(container, value) {
          const text = String(value || "");
          const imagePattern = /!\\[([^\\]]*)\\]\\(([^)]+)\\)/g;
          let cursor = 0;
          let match;
          function addText(chunk) {
            if (!chunk.trim()) return;
            const block = document.createElement("div");
            block.className = "preview-text";
            renderMathInto(block, chunk.trim());
            container.appendChild(block);
          }
          while ((match = imagePattern.exec(text))) {
            addText(text.slice(cursor, match.index));
            const url = match[2].trim();
            if (isImageUrl(url)) {
              const image = document.createElement("img");
              image.className = "preview-image";
              image.src = url;
              image.alt = match[1] || "Hình minh họa";
              image.loading = "lazy";
              container.appendChild(image);
            } else {
              addText(match[0]);
            }
            cursor = match.index + match[0].length;
          }
          addText(text.slice(cursor));
          rerenderFallbackMath(container);
        }
        function renderPreview(data) {
          preview.replaceChildren();
          if (!data.ok) {
            const error = document.createElement("div");
            error.className = "preview-error";
            error.textContent = data.error || "Không đọc được nội dung import.";
            preview.appendChild(error);
            return;
          }
          if (!data.questions.length) {
            const empty = document.createElement("div");
            empty.className = "muted";
            empty.textContent = "Bản xem trước câu hỏi và đáp án sẽ hiện ở đây sau khi bạn dán nội dung hoặc chọn file.";
            preview.appendChild(empty);
            return;
          }
          data.questions.forEach((question, index) => {
            const card = document.createElement("article");
            card.className = "preview-question";
            const title = document.createElement("h3");
            title.textContent = "Câu " + (index + 1);
            card.appendChild(title);
            addRichText(card, question.prompt);
            const options = document.createElement("div");
            options.className = "preview-options";
            question.answers.forEach((answer) => {
              const option = document.createElement("div");
              option.className = "preview-option";
              const label = document.createElement("strong");
              label.textContent = answer.label;
              const content = document.createElement("div");
              addRichText(content, answer.content);
              option.append(label, content);
              options.appendChild(option);
            });
            card.appendChild(options);
            const meta = document.createElement("div");
            meta.className = "mini-note";
            meta.textContent = "Đáp án đúng: " + question.correct;
            card.appendChild(meta);
            preview.appendChild(card);
          });
        }
        async function refreshPreview() {
          const body = new URLSearchParams();
          body.set("bulkQuestions", bulk.value);
          try {
            const response = await fetch("/exams/preview", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
              body,
            });
            renderPreview(await response.json());
          } catch {
            renderPreview({ ok: false, error: "Không kết nối được server preview." });
          }
        }
        function schedulePreview() {
          window.clearTimeout(previewTimer);
          previewTimer = window.setTimeout(refreshPreview, 250);
        }
        function readImageFile(file) {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
        function insertAtCursor(textarea, text) {
          const start = textarea.selectionStart ?? textarea.value.length;
          const end = textarea.selectionEnd ?? textarea.value.length;
          textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
          const next = start + text.length;
          textarea.selectionStart = next;
          textarea.selectionEnd = next;
          textarea.focus();
        }
        function syncFlow() {
          const flow = flows.find((item) => item.id === level.value) || flows[0];
          grade.innerHTML = flow.grades.map((item) => '<option value="' + item.replaceAll('"', '&quot;') + '">' + item + '</option>').join('');
          const allowed = new Set(flow.subjects);
          let firstVisible = "";
          Array.from(subject.options).forEach((option) => {
            const show = allowed.has(option.dataset.name || "");
            option.hidden = !show;
            option.disabled = !show;
            if (show && !firstVisible) firstVisible = option.value;
          });
          if (!firstVisible) {
            Array.from(subject.options).forEach((option) => { option.hidden = false; option.disabled = false; });
            firstVisible = subject.options[0]?.value || "";
          }
          if (!subject.value || subject.selectedOptions[0]?.disabled) subject.value = firstVisible;
        }
        document.querySelectorAll(".formula-chip").forEach((chip) => {
          const raw = chip.textContent || "";
          chip.replaceChildren();
          renderMathInto(chip, raw);
        });
        window.addEventListener("load", () => {
          rerenderFallbackMath(document);
        });
        document.querySelectorAll("[data-content-mode]").forEach((button) => {
          button.addEventListener("click", () => {
            document.querySelectorAll("[data-content-mode]").forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
            contentModeInput.value = button.dataset.contentMode || "topics";
            examTypeInput.value = button.dataset.examType || "PRACTICE";
            contentModeNote.textContent = modeNotes[contentModeInput.value] || modeNotes.topics;
          });
        });
        level.addEventListener("change", syncFlow);
        document.querySelectorAll("[data-template]").forEach((button) => {
          button.addEventListener("click", () => {
            bulk.value = templates[button.dataset.template] || "";
            bulk.focus();
            schedulePreview();
          });
        });
        document.getElementById("clearImport").addEventListener("click", () => {
          bulk.value = "";
          bulk.focus();
          schedulePreview();
        });
        importFile.addEventListener("change", async () => {
          const file = importFile.files && importFile.files[0];
          if (!file) return;
          bulk.value = await file.text();
          bulk.focus();
          schedulePreview();
        });
        imageFiles.addEventListener("change", async () => {
          const files = Array.from(imageFiles.files || []);
          if (!files.length) return;
          const snippets = [];
          for (const file of files) {
            const dataUrl = await readImageFile(file);
            snippets.push("\\nẢnh: " + dataUrl + "\\n");
          }
          insertAtCursor(bulk, snippets.join(""));
          imageFiles.value = "";
          schedulePreview();
        });
        bulk.addEventListener("input", schedulePreview);
        syncFlow();
        schedulePreview();
      })();
    </script>
  </section>`;
}

async function examsPage(user, notice) {
  const [exams, subjects] = await Promise.all([
    prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { subject: true, _count: { select: { questions: true, attempts: true } } },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);
  const rows = exams.map((item) =>
    row([
      `<strong>${escapeHtml(item.title)}</strong><div class="muted">${escapeHtml(item.code)}</div>`,
      escapeHtml(item.subject?.name || "-"),
      badge(examContentModeLabel(item.examStructure?.contentMode) || item.type),
      badge(item.accessLevel),
      `${formatNumber(item._count.questions)} câu / ${formatNumber(item._count.attempts)} lượt`,
      `${item.durationMinutes} phút`,
      `<form method="post" action="/exams/${item.id}/delete" onsubmit="return confirm('Xóa đề thi này? Toàn bộ câu hỏi, đáp án và lượt làm liên quan cũng sẽ bị xóa.')"><button class="danger" type="submit">Xóa</button></form>`,
    ]),
  );
  const body = `${pageHeader("Đề thi", "Tạo đề theo cấp học, lớp/nhóm thi và môn học giống luồng học sinh trên web.", `<a class="button" href="#tao-de-theo-mon">Tạo đề mới</a>`)}
  ${examCreateForm(subjects)}
  <div style="margin-top:18px">${table(["Đề", "Môn", "Loại", "Quyền", "Thống kê", "Thời gian", "Thao tác"], rows)}</div>`;
  return layout({ title: "Đề thi", active: "/exams", user, notice, body });
}

const documentTypes = [
  { value: "MOCK_EXAM", label: "Đề thi thử" },
  { value: "THEORY_SUMMARY", label: "Tóm tắt lý thuyết" },
  { value: "FORMULA_HANDBOOK", label: "Sổ tay công thức" },
  { value: "FINAL_REVIEW", label: "Ôn tập cuối kỳ" },
];
const documentStatuses = ["PENDING", "APPROVED", "REJECTED"];
const documentMimeTypes = new Map([
  [".pdf", "application/pdf"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
]);

function documentsDirectory() {
  return path.join(process.cwd(), "public", "uploads", "documents");
}

function safeUploadName(filename) {
  const extension = path.extname(filename || "").toLowerCase();
  if (!documentMimeTypes.has(extension)) throw new Error("Chỉ hỗ trợ PDF, DOCX và PPTX.");
  return { extension, mimeType: documentMimeTypes.get(extension) };
}

function formatFileSize(size) {
  const value = Number(size || 0);
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function documentUploadForm() {
  return `<section class="card">
    <h1 style="font-size:26px">Tải tài liệu lên</h1>
    <div class="subtitle">Admin có thể tải PDF, DOCX hoặc PPTX lên hệ thống. Tài liệu có thể được duyệt sẵn để học sinh thấy ngay.</div>
    <form class="form" method="post" action="/documents/upload" enctype="multipart/form-data" style="margin-top:14px">
      <div class="exam-create-grid">
        <label class="wide">Tên tài liệu<input name="title" required placeholder="Ví dụ: Sổ tay công thức Toán lớp 9" /></label>
        <label>Cấp học<select name="level">${optionList(studyFlows.map((flow) => ({ value: flow.id, label: flow.label })), "THCS")}</select></label>
        <label>Lớp / nhóm thi<input name="grade" required placeholder="Lớp 9, Môn thi..." /></label>
        <label>Môn học<input name="subject" required placeholder="Toán, Vật Lý, Hóa Học..." /></label>
        <label>Loại tài liệu<select name="type">${optionList(documentTypes, "FORMULA_HANDBOOK")}</select></label>
        <label>Trạng thái<select name="status">${optionList(documentStatuses, "APPROVED")}</select></label>
        <label>Tệp tài liệu<input name="file" type="file" accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation" required /></label>
        <label class="wide">Mô tả<textarea name="description" rows="3" required placeholder="Nội dung chính của tài liệu, dùng để học sinh hiểu tài liệu này dùng cho phần nào."></textarea></label>
      </div>
      <button type="submit">Tải lên tài liệu</button>
    </form>
  </section>`;
}

async function documentsPage(user, notice) {
  const docs = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { uploader: true, _count: { select: { ratings: true, reports: true } } },
  });
  const rows = docs.map((item) =>
    row([
      `<strong>${escapeHtml(item.title)}</strong><div class="muted">${escapeHtml(item.originalName)}</div><div class="mini-note">${escapeHtml(formatFileSize(item.fileSize))}</div>`,
      escapeHtml(item.uploader?.email || "-"),
      badge(item.status),
      `${escapeHtml(item.level)} / ${escapeHtml(item.grade)} / ${escapeHtml(item.subject)}<div class="mini-note">${escapeHtml(item.type)}</div>`,
      `${formatNumber(item.downloads)}<div class="mini-note">${formatNumber(item._count.ratings)} đánh giá · ${formatNumber(item._count.reports)} báo cáo</div>`,
      escapeHtml(formatDate(item.createdAt)),
      `<div class="inline-form">
        <a class="button secondary" href="/documents/${encodeURIComponent(item.id)}">Xem</a>
        <a class="button secondary" href="/documents/${encodeURIComponent(item.id)}/file" target="_blank" rel="noopener">Mở tệp</a>
        <form method="post" action="/documents/${encodeURIComponent(item.id)}/delete" onsubmit="return confirm('Xóa tài liệu này khỏi hệ thống?')">
          <button class="danger" type="submit">Xóa</button>
        </form>
      </div>`,
    ]),
  );
  const body = `${pageHeader("Tài liệu", "Tải lên, xem chi tiết và xóa tài liệu trong hệ thống.")}
  ${documentUploadForm()}
  <div style="margin-top:18px">${table(["Tài liệu", "Người tải", "Trạng thái", "Phân loại", "Lượt tải", "Ngày tạo", "Thao tác"], rows)}</div>`;
  return layout({ title: "Tài liệu", active: "/documents", user, notice, body });
}

async function documentDetailPage(user, notice, id) {
  const item = await prisma.document.findUnique({
    where: { id },
    include: { uploader: true, ratings: true, reports: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!item) return layout({ title: "Không tìm thấy", active: "/documents", user, notice, body: pageHeader("Không tìm thấy", "Tài liệu không tồn tại hoặc đã bị xóa.") });
  const ratingTotal = item.ratings.reduce((sum, rating) => sum + rating.rating, 0);
  const averageRating = item.ratings.length ? (ratingTotal / item.ratings.length).toFixed(1) : "0";
  const preview = item.mimeType === "application/pdf"
    ? `<iframe class="file-preview" src="/documents/${encodeURIComponent(item.id)}/file"></iframe>`
    : `<section class="card"><h1 style="font-size:24px">Xem tài liệu</h1><p class="subtitle">Trình duyệt thường không xem trực tiếp DOCX/PPTX trong admin. Bạn có thể mở hoặc tải tệp gốc.</p><a class="button" href="/documents/${encodeURIComponent(item.id)}/file" target="_blank" rel="noopener">Mở / tải tệp</a></section>`;
  const reportRows = item.reports.map((report) => row([
    escapeHtml(report.user?.email || "-"),
    escapeHtml(report.reason),
    escapeHtml(report.details || "-"),
    badge(report.status),
    escapeHtml(formatDate(report.createdAt)),
  ]));
  const body = `${pageHeader(item.title, "Chi tiết tài liệu, trạng thái duyệt, tệp gốc và báo cáo liên quan.", `<a class="button secondary" href="/documents">Quay lại</a>`)}
  <section class="card">
    <div class="detail-grid">
      <div class="detail-item"><span>Người tải</span><strong>${escapeHtml(item.uploader?.email || "-")}</strong></div>
      <div class="detail-item"><span>Trạng thái</span><strong>${escapeHtml(item.status)}</strong></div>
      <div class="detail-item"><span>Phân loại</span><strong>${escapeHtml(item.level)} / ${escapeHtml(item.grade)} / ${escapeHtml(item.subject)}</strong></div>
      <div class="detail-item"><span>Loại</span><strong>${escapeHtml(item.type)}</strong></div>
      <div class="detail-item"><span>Lượt tải</span><strong>${formatNumber(item.downloads)}</strong></div>
      <div class="detail-item"><span>Đánh giá</span><strong>${averageRating}/5 (${formatNumber(item.ratings.length)})</strong></div>
      <div class="detail-item"><span>Tệp</span><strong>${escapeHtml(item.originalName)}</strong></div>
      <div class="detail-item"><span>Dung lượng</span><strong>${escapeHtml(formatFileSize(item.fileSize))}</strong></div>
      <div class="detail-item"><span>Ngày tạo</span><strong>${escapeHtml(formatDate(item.createdAt))}</strong></div>
    </div>
    <p class="subtitle" style="margin-top:16px">${escapeHtml(item.description)}</p>
    <div class="inline-form" style="margin-top:16px">
      <a class="button" href="/documents/${encodeURIComponent(item.id)}/file" target="_blank" rel="noopener">Mở tệp</a>
      <form method="post" action="/documents/${encodeURIComponent(item.id)}/delete" onsubmit="return confirm('Xóa tài liệu này khỏi hệ thống?')"><button class="danger" type="submit">Xóa tài liệu</button></form>
    </div>
  </section>
  <div style="margin-top:18px">${preview}</div>
  <div style="margin-top:18px">${table(["Người báo cáo", "Lý do", "Chi tiết", "Trạng thái", "Ngày"], reportRows)}</div>`;
  return layout({ title: item.title, active: "/documents", user, notice, body });
}

async function uploadDocument(req, res, user) {
  try {
    const { fields, files } = await readMultipartForm(req);
    const file = files.get("file");
    const title = String(fields.get("title") || "").trim();
    const description = String(fields.get("description") || "").trim();
    const level = String(fields.get("level") || "THCS");
    const grade = String(fields.get("grade") || "").trim();
    const subject = String(fields.get("subject") || "").trim();
    const type = String(fields.get("type") || "FORMULA_HANDBOOK");
    const status = String(fields.get("status") || "APPROVED");

    if (!title || !description || !grade || !subject || !file) throw new Error("Vui lòng nhập đủ thông tin và chọn tệp tài liệu.");
    if (!studyFlows.some((flow) => flow.id === level)) throw new Error("Cấp học không hợp lệ.");
    if (!documentTypes.some((item) => item.value === type) || !documentStatuses.includes(status)) throw new Error("Phân loại hoặc trạng thái không hợp lệ.");
    if (file.size > 15 * 1024 * 1024) throw new Error("Tệp phải nhỏ hơn hoặc bằng 15MB.");
    const { extension, mimeType } = safeUploadName(file.filename);
    const storedName = `${crypto.randomUUID()}${extension}`;
    const uploadDirectory = documentsDirectory();
    fs.mkdirSync(uploadDirectory, { recursive: true });
    fs.writeFileSync(path.join(uploadDirectory, storedName), file.buffer);
    await prisma.document.create({
      data: {
        title,
        description,
        level,
        grade,
        subject,
        type,
        status,
        approvedAt: status === "APPROVED" ? new Date() : null,
        originalName: path.basename(file.filename),
        storedName,
        mimeType,
        fileSize: file.size,
        uploaderId: user.id,
      },
    });
    redirect(res, `/documents?notice=${encodeURIComponent("Đã tải tài liệu lên hệ thống")}`);
  } catch (error) {
    redirect(res, `/documents?notice=${encodeURIComponent(error.message || "Không thể tải tài liệu")}`);
  }
}

async function sendDocumentFile(res, id) {
  const item = await prisma.document.findUnique({ where: { id } });
  if (!item) return sendHtml(res, "Không tìm thấy tài liệu", 404);
  const filePath = path.join(documentsDirectory(), item.storedName);
  if (!fs.existsSync(filePath)) return sendHtml(res, "Tệp tài liệu không còn tồn tại", 404);
  const file = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": item.mimeType,
    "Content-Length": String(file.length),
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(item.originalName)}`,
    "Cache-Control": "private, no-store",
  });
  res.end(file);
}

async function deleteDocument(req, res, id) {
  const item = await prisma.document.findUnique({ where: { id } });
  if (!item) {
    redirect(res, `/documents?notice=${encodeURIComponent("Tài liệu không tồn tại hoặc đã bị xóa")}`);
    return;
  }
  await prisma.document.delete({ where: { id } });
  fs.rmSync(path.join(documentsDirectory(), item.storedName), { force: true });
  redirect(res, `/documents?notice=${encodeURIComponent("Đã xóa tài liệu khỏi hệ thống")}`);
}

const paymentStatuses = ["PENDING", "PAID", "FAILED"];
const planIntervals = ["MONTH", "QUARTER", "YEAR"];

function planIntervalLabel(value) {
  if (value === "MONTH") return "Tháng";
  if (value === "QUARTER") return "Quý";
  if (value === "YEAR") return "Năm";
  return value;
}

function planDurationMonths(value) {
  if (value === "QUARTER") return 3;
  if (value === "YEAR") return 12;
  return 1;
}

async function makeUniquePlanSlug(slug, currentId = "") {
  let candidate = slugify(slug);
  let index = 2;
  while (await prisma.plan.findFirst({ where: { slug: candidate, ...(currentId ? { NOT: { id: currentId } } : {}) }, select: { id: true } })) {
    candidate = `${slugify(slug)}-${index}`;
    index += 1;
  }
  return candidate;
}

function parsePlanForm(form) {
  const name = String(form.get("name") || "").trim();
  const description = String(form.get("description") || "").trim();
  const requestedSlug = String(form.get("slug") || name).trim();
  const price = Math.max(0, Math.floor(Number(form.get("price") || 0)));
  const interval = String(form.get("interval") || "MONTH");
  const featureLines = String(form.get("features") || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!name || !description || !requestedSlug || !planIntervals.includes(interval)) {
    throw new Error("Thiếu tên, mô tả hoặc chu kỳ gói VIP không hợp lệ");
  }
  return {
    name,
    description,
    slug: slugify(requestedSlug),
    price,
    interval,
    features: featureLines.length ? featureLines : ["Quyền truy cập gói VIP"],
    isActive: String(form.get("isActive") || "true") === "true",
  };
}

async function activateVipFromPayment(payment) {
  const plan = payment.plan || await prisma.plan.findUnique({ where: { id: payment.planId } });
  if (!plan) throw new Error("Không tìm thấy gói VIP của giao dịch");
  const now = new Date();
  const latestActive = await prisma.subscription.findFirst({
    where: { userId: payment.userId, status: "ACTIVE", endsAt: { gt: now } },
    orderBy: { endsAt: "desc" },
  });
  const startsAt = latestActive?.endsAt && latestActive.endsAt > now ? latestActive.endsAt : now;
  const endsAt = new Date(startsAt);
  endsAt.setMonth(endsAt.getMonth() + planDurationMonths(plan.interval));
  await prisma.subscription.create({
    data: {
      userId: payment.userId,
      planId: payment.planId,
      status: "ACTIVE",
      startsAt,
      endsAt,
    },
  });
}

async function activateVipForUser(userId, planId) {
  const [targetUser, plan] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);
  if (!targetUser) throw new Error("Không tìm thấy người dùng");
  if (!plan || !plan.isActive) throw new Error("Gói VIP không tồn tại hoặc đang ẩn");
  const now = new Date();
  const latestActive = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE", endsAt: { gt: now } },
    orderBy: { endsAt: "desc" },
  });
  const startsAt = latestActive?.endsAt && latestActive.endsAt > now ? latestActive.endsAt : now;
  const endsAt = new Date(startsAt);
  endsAt.setMonth(endsAt.getMonth() + planDurationMonths(plan.interval));
  await prisma.subscription.create({
    data: {
      userId,
      planId,
      status: "ACTIVE",
      startsAt,
      endsAt,
    },
  });
  await prisma.notification.create({
    data: {
      userId,
      title: "Tài khoản đã được nâng VIP",
      message: `Admin đã kích hoạt ${plan.name} cho tài khoản của bạn đến ${formatDate(endsAt)}.`,
      link: "/vip",
    },
  }).catch(() => null);
  return { targetUser, plan, endsAt };
}

async function paymentsPage(user, notice, url) {
  const status = String(url.searchParams.get("status") || "ALL");
  const paymentWhere = paymentStatuses.includes(status) ? { status } : {};
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [
    payments,
    plans,
    activeSubscriptions,
    paidRevenue,
    monthRevenue,
    pendingCount,
    failedCount,
    activeSubscriptionCount,
    activePlanCount,
  ] = await Promise.all([
    prisma.payment.findMany({ where: paymentWhere, orderBy: { createdAt: "desc" }, take: 150, include: { user: true, plan: true } }),
    prisma.plan.findMany({ orderBy: [{ isActive: "desc" }, { price: "asc" }], include: { _count: { select: { payments: true, subscriptions: true } } } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE", endsAt: { gt: now } },
      orderBy: { endsAt: "desc" },
      take: 30,
      include: { user: true, plan: true },
    }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: "PAID", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.subscription.count({ where: { status: "ACTIVE", endsAt: { gt: now } } }),
    prisma.plan.count({ where: { isActive: true } }),
  ]);

  const statCards = [
    ["Doanh thu đã trả", `${formatNumber(paidRevenue._sum.amount || 0)} VND`],
    ["Tháng này", `${formatNumber(monthRevenue._sum.amount || 0)} VND`],
    ["Chờ xử lý", pendingCount],
    ["VIP đang hoạt động", activeSubscriptionCount],
  ]
    .map(([label, value]) => `<section class="card"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${escapeHtml(value)}</div></section>`)
    .join("");

  const filters = `<form class="card filters" method="get" action="/payments">
    <label>Trạng thái giao dịch
      <select name="status">
        <option value="ALL"${selected(status, "ALL")}>Tất cả</option>
        ${paymentStatuses.map((item) => `<option value="${item}"${selected(status, item)}>${item}</option>`).join("")}
      </select>
    </label>
    <button type="submit">Lọc</button>
    <a class="button secondary" href="/payments">Xóa lọc</a>
  </form>`;

  const paymentRows = payments.map((item) =>
    row([
      `<strong>${escapeHtml(item.reference)}</strong><div class="mini-note">${escapeHtml(item.provider)}</div>`,
      `<strong>${escapeHtml(item.user?.name || "Chưa đặt tên")}</strong><div class="mini-note">${escapeHtml(item.user?.email || "-")}</div>`,
      escapeHtml(item.plan?.name || item.planId),
      `${formatNumber(item.amount)} VND`,
      badge(item.status),
      escapeHtml(formatDate(item.createdAt)),
      `<form class="inline-form" method="post" action="/payments/${item.id}/status">
        <select name="status">
          ${paymentStatuses.map((value) => `<option value="${value}"${selected(item.status, value)}>${value}</option>`).join("")}
        </select>
        <button type="submit">Lưu</button>
      </form>`,
    ]),
  );

  const planRows = plans.map((item) =>
    row([
      `<strong>${escapeHtml(item.name)}</strong><div class="mini-note">${escapeHtml(item.description)}</div>`,
      escapeHtml(item.slug),
      `${formatNumber(item.price)} VND`,
      badge(planIntervalLabel(item.interval)),
      item.isActive ? badge("Đang bán") : `<span class="muted">Đang ẩn</span>`,
      `${formatNumber(item._count.subscriptions)} VIP / ${formatNumber(item._count.payments)} giao dịch`,
      `<form method="post" action="/plans/${item.id}/toggle"><button class="${item.isActive ? "secondary" : ""}" type="submit">${item.isActive ? "Ẩn gói" : "Bật bán"}</button></form>`,
    ]),
  );

  const subscriptionRows = activeSubscriptions.map((item) =>
    row([
      `<strong>${escapeHtml(item.user?.name || "Chưa đặt tên")}</strong><div class="mini-note">${escapeHtml(item.user?.email || "-")}</div>`,
      escapeHtml(item.plan?.name || item.planId),
      badge(item.status),
      escapeHtml(formatDate(item.startsAt)),
      escapeHtml(formatDate(item.endsAt)),
    ]),
  );

  const body = `${pageHeader("Thanh toán & gói VIP", "Gộp quản lý giao dịch, gói thành viên và VIP đang hoạt động trên một trang.")}
    <div class="grid stats">${statCards}</div>
    <div style="margin-top:16px">${filters}</div>
    <div style="margin-top:18px">${pageHeader("Giao dịch", `${payments.length} giao dịch đang hiển thị. Có ${failedCount} giao dịch thất bại.`)}${table(["Mã", "Người dùng", "Gói", "Số tiền", "Trạng thái", "Ngày tạo", "Thao tác"], paymentRows)}</div>
    <div style="margin-top:18px">${pageHeader("Gói VIP", `${activePlanCount} gói đang bán trên web.`)}${table(["Gói", "Slug", "Giá", "Chu kỳ", "Trạng thái", "Sử dụng", "Thao tác"], planRows)}</div>
    <div style="margin-top:18px">${pageHeader("VIP đang hoạt động", "30 tài khoản có hạn VIP mới nhất.")}${table(["Người dùng", "Gói", "Trạng thái", "Bắt đầu", "Hết hạn"], subscriptionRows)}</div>`;
  return layout({ title: "Thanh toán & gói VIP", active: "/payments", user, notice, body });
}

async function createPlan(req, res) {
  try {
    const form = await readForm(req);
    const data = parsePlanForm(form);
    data.slug = await makeUniquePlanSlug(data.slug);
    await prisma.plan.create({ data });
    redirect(res, `/payments?notice=${encodeURIComponent("Đã tạo gói VIP mới")}`);
  } catch (error) {
    redirect(res, `/payments?notice=${encodeURIComponent(error.message || "Không thể tạo gói VIP")}`);
  }
}

async function upgradeUserVip(req, res, userId) {
  try {
    const form = await readForm(req);
    const planId = String(form.get("planId") || "").trim();
    const result = await activateVipForUser(userId, planId);
    redirect(res, `/users?notice=${encodeURIComponent(`Đã nâng VIP ${result.plan.name} cho ${result.targetUser.email || result.targetUser.name}`)}`);
  } catch (error) {
    redirect(res, `/users?notice=${encodeURIComponent(error.message || "Không thể nâng VIP cho người dùng")}`);
  }
}

async function togglePlan(res, id) {
  try {
    const plan = await prisma.plan.findUnique({ where: { id }, select: { isActive: true } });
    if (!plan) {
      redirect(res, `/payments?notice=${encodeURIComponent("Không tìm thấy gói VIP")}`);
      return;
    }
    await prisma.plan.update({ where: { id }, data: { isActive: !plan.isActive } });
    redirect(res, `/payments?notice=${encodeURIComponent(plan.isActive ? "Đã ẩn gói VIP khỏi web" : "Đã bật bán gói VIP")}`);
  } catch (error) {
    redirect(res, `/payments?notice=${encodeURIComponent(error.message || "Không thể cập nhật gói VIP")}`);
  }
}

async function updatePaymentStatus(req, res, id) {
  try {
    const form = await readForm(req);
    const nextStatus = String(form.get("status") || "");
    if (!paymentStatuses.includes(nextStatus)) throw new Error("Trạng thái giao dịch không hợp lệ");
    const current = await prisma.payment.findUnique({ where: { id }, include: { plan: true, user: true } });
    if (!current) throw new Error("Không tìm thấy giao dịch");
    const metadata = current.metadata && typeof current.metadata === "object" && !Array.isArray(current.metadata) ? current.metadata : {};
    const shouldActivateVip = nextStatus === "PAID" && current.status !== "PAID" && !metadata.adminVipActivatedAt;
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(shouldActivateVip ? { metadata: { ...metadata, adminVipActivatedAt: new Date().toISOString() } } : {}),
      },
      include: { plan: true, user: true },
    });
    if (shouldActivateVip) {
      await activateVipFromPayment(payment);
      await prisma.notification.create({
        data: {
          userId: payment.userId,
          title: "Gói VIP đã được kích hoạt",
          message: `Giao dịch ${payment.reference} đã được duyệt. Gói ${payment.plan?.name || "VIP"} đã được cộng vào tài khoản.`,
          href: "/vip",
        },
      }).catch(() => null);
    }
    redirect(res, `/payments?notice=${encodeURIComponent(nextStatus === "PAID" ? "Đã cập nhật giao dịch và kích hoạt VIP" : "Đã cập nhật trạng thái giao dịch")}`);
  } catch (error) {
    redirect(res, `/payments?notice=${encodeURIComponent(error.message || "Không thể cập nhật giao dịch")}`);
  }
}

const storeCategories = [
  { value: "EQUIPMENT", label: "Trang bị" },
  { value: "HELP", label: "Trợ giúp" },
  { value: "STUDY_PACK", label: "Gói học tập" },
  { value: "GIFT", label: "Đổi quà" },
  { value: "AVATAR", label: "Avatar" },
];
const storeCurrencies = ["COIN", "EXP"];

function parseStoreJson(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;
  return JSON.parse(raw);
}

function storeJsonText(value) {
  return escapeHtml(JSON.stringify(value || {}, null, 2));
}

function parseStoreItemForm(form, { keepSlug = false } = {}) {
  const name = String(form.get("name") || "").trim();
  const requestedSlug = slugify(String(form.get("slug") || name));
  const description = String(form.get("description") || "").trim();
  const category = String(form.get("category") || "GIFT");
  const currency = String(form.get("currency") || "EXP");
  const price = Math.max(0, Math.floor(Number(form.get("price") || 0)));
  const imageKey = String(form.get("imageKey") || "orange").trim() || "orange";
  const badgeText = String(form.get("badge") || "").trim();
  const stockText = String(form.get("stock") || "").trim();
  const sortOrder = Math.floor(Number(form.get("sortOrder") || 0));
  const isActive = String(form.get("isActive") || "true") === "true";
  const isFeatured = String(form.get("isFeatured") || "false") === "true";
  const isConsumable = String(form.get("isConsumable") || "false") === "true";
  const metadata = parseStoreJson(form.get("metadata"));

  if (!name || !description || !requestedSlug || !storeCategories.some((item) => item.value === category) || !storeCurrencies.includes(currency)) {
    throw new Error("Thiếu thông tin hoặc danh mục cửa hàng không hợp lệ");
  }

  const data = {
    name,
    description,
    category,
    price,
    currency,
    imageKey,
    badge: badgeText || null,
    isFeatured,
    isConsumable,
    isActive,
    stock: stockText ? Math.max(0, Math.floor(Number(stockText) || 0)) : null,
    metadata,
    sortOrder,
  };
  if (!keepSlug) data.slug = requestedSlug;
  return data;
}

async function makeUniqueStoreSlug(slug, currentId = "") {
  const existing = await prisma.storeItem.findUnique({ where: { slug } });
  if (!existing || existing.id === currentId) return slug;
  return `${slug}-${Date.now().toString(36)}`;
}

function storeItemForm(item = null) {
  const action = item ? `/store-items/${item.id}/update` : "/store-items/create";
  const title = item ? escapeHtml(item.name) : "Thêm vật phẩm cửa hàng";
  const subtitle = item
    ? `${item.isActive ? "Đang bán" : "Đang ẩn"} · ${formatNumber(item.price)} ${escapeHtml(item.currency)} · ${formatNumber(item._count?.purchases || 0)} lượt mua`
    : "Tạo vật phẩm mới để hiển thị trong cửa hàng web.";

  return `<section class="card">
    <h1 style="font-size:26px">${title}</h1>
    <div class="subtitle">${subtitle}</div>
    <form class="form" method="post" action="${action}" style="margin-top:14px">
      <div class="exam-create-grid">
        <label>Tên vật phẩm<input name="name" required value="${escapeHtml(item?.name || "")}" placeholder="Ví dụ: Khung viền vòng nguyệt quế vàng" /></label>
        <label>Slug<input name="slug" value="${escapeHtml(item?.slug || "")}" placeholder="khung-vien-vong-nguyet-que-vang" /></label>
        <label>Danh mục<select name="category">${optionList(storeCategories, item?.category || "EQUIPMENT")}</select></label>
        <label>Giá Coin/EXP<input name="price" type="number" min="0" value="${escapeHtml(String(item?.price ?? 100))}" required /></label>
        <label>Tiền tệ<select name="currency">${optionList(storeCurrencies, item?.currency || "EXP")}</select></label>
        <label>Tồn kho<input name="stock" type="number" min="0" value="${escapeHtml(item?.stock == null ? "" : String(item.stock))}" placeholder="Bỏ trống nếu không giới hạn" /></label>
        <label>Image key<input name="imageKey" value="${escapeHtml(item?.imageKey || "orange")}" placeholder="orange, neon-city, title..." /></label>
        <label>Nhãn<input name="badge" value="${escapeHtml(item?.badge || "")}" placeholder="Mới, Hot, VIP..." /></label>
        <label>Sắp xếp<input name="sortOrder" type="number" value="${escapeHtml(String(item?.sortOrder ?? 0))}" /></label>
        <label>Trạng thái<select name="isActive"><option value="true"${selected(String(Boolean(item?.isActive ?? true)), "true")}>Đang bán</option><option value="false"${selected(String(Boolean(item?.isActive ?? true)), "false")}>Ẩn khỏi web</option></select></label>
        <label>Nổi bật<select name="isFeatured"><option value="false"${selected(String(Boolean(item?.isFeatured ?? false)), "false")}>Không</option><option value="true"${selected(String(Boolean(item?.isFeatured ?? false)), "true")}>Có</option></select></label>
        <label>Dùng một lần<select name="isConsumable"><option value="false"${selected(String(Boolean(item?.isConsumable ?? false)), "false")}>Không</option><option value="true"${selected(String(Boolean(item?.isConsumable ?? false)), "true")}>Có</option></select></label>
        <label class="wide">Mô tả<textarea name="description" rows="3" required placeholder="Mô tả ngắn hiển thị ở cửa hàng.">${escapeHtml(item?.description || "")}</textarea></label>
        <label class="wide">Metadata JSON<textarea name="metadata" rows="6" placeholder='{"kind":"avatar-frame","style":"gold-laurel"}'>${storeJsonText(item?.metadata)}</textarea></label>
      </div>
      <button type="submit">${item ? "Lưu vật phẩm" : "Thêm vào cửa hàng"}</button>
    </form>
    ${item ? `<form method="post" action="/store-items/${item.id}/delete" style="margin-top:10px">
      <button type="submit" style="background:#ef4444">Xóa / ẩn vật phẩm</button>
    </form>` : ""}
  </section>`;
}

async function storeItemsPage(user, notice) {
  const items = await prisma.storeItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { _count: { select: { purchases: true } } },
  });
  const activeCount = items.filter((item) => item.isActive).length;
  const body = `${pageHeader("Cửa hàng", "Quản lý vật phẩm đang liên kết với cửa hàng trong web: trang bị, trợ giúp, gói học tập, quà đổi và avatar.")}
  <section class="card" style="margin-bottom:18px">
    <h1 style="font-size:26px">Tổng quan cửa hàng</h1>
    <div class="subtitle">${formatNumber(activeCount)} vật phẩm đang bán · ${formatNumber(items.length)} vật phẩm trong hệ thống</div>
    <div class="mini-note">Mẹo metadata: dùng kind như avatarFrame, nameColor, title, submitEffect, fiftyFifty, extraTime, guardian, hopeStar, examPack, analyticsPack hoặc voucher để web hiểu đúng chức năng.</div>
  </section>
  ${storeItemForm()}
  <div class="grid two" style="margin-top:18px">${items.map((item) => storeItemForm(item)).join("")}</div>`;
  return layout({ title: "Cửa hàng", active: "/store-items", user, notice, body });
}

async function createStoreItem(req, res) {
  try {
    const form = await readForm(req);
    const data = parseStoreItemForm(form);
    data.slug = await makeUniqueStoreSlug(data.slug);
    await prisma.storeItem.create({ data });
    redirect(res, `/store-items?notice=${encodeURIComponent("Đã thêm vật phẩm vào cửa hàng")}`);
  } catch (error) {
    redirect(res, `/store-items?notice=${encodeURIComponent(error.message || "Không thể thêm vật phẩm")}`);
  }
}

async function updateStoreItem(req, res, id) {
  try {
    const form = await readForm(req);
    const data = parseStoreItemForm(form);
    data.slug = await makeUniqueStoreSlug(data.slug, id);
    await prisma.storeItem.update({ where: { id }, data });
    redirect(res, `/store-items?notice=${encodeURIComponent("Đã lưu thay đổi vật phẩm")}`);
  } catch (error) {
    redirect(res, `/store-items?notice=${encodeURIComponent(error.message || "Không thể cập nhật vật phẩm")}`);
  }
}

async function deleteStoreItem(req, res, id) {
  const purchases = await prisma.storePurchase.count({ where: { itemId: id } });
  if (purchases > 0) {
    await prisma.storeItem.update({ where: { id }, data: { isActive: false } });
    redirect(res, `/store-items?notice=${encodeURIComponent("Vật phẩm đã có giao dịch nên được ẩn khỏi web thay vì xóa hẳn")}`);
    return;
  }
  await prisma.storeItem.delete({ where: { id } });
  redirect(res, `/store-items?notice=${encodeURIComponent("Đã xóa vật phẩm khỏi cửa hàng")}`);
}

async function createMotivationQuote(req, res) {
  const form = await readForm(req);
  const text = String(form.get("text") || "").trim();
  const author = String(form.get("author") || "").trim();
  const isActive = String(form.get("isActive") || "") === "true";
  if (!text) return redirect(res, `/motivation?notice=${encodeURIComponent("Cần nhập nội dung câu nói")}`);
  const config = readDashboardContentConfig();
  if (isActive) config.quotes = config.quotes.map((item) => ({ ...item, isActive: false }));
  config.quotes.unshift({
    id: crypto.randomUUID(),
    text,
    author,
    isActive: isActive || config.quotes.length === 0,
    createdAt: new Date().toISOString(),
  });
  writeDashboardContentConfig(config);
  redirect(res, `/motivation?notice=${encodeURIComponent("Đã thêm câu nói cổ vũ")}`);
}

function activateMotivationQuote(res, id) {
  const config = readDashboardContentConfig();
  config.quotes = config.quotes.map((item) => ({ ...item, isActive: item.id === id }));
  writeDashboardContentConfig(config);
  redirect(res, `/motivation?notice=${encodeURIComponent("Đã đổi câu nói đang hiển thị")}`);
}

function deleteMotivationQuote(res, id) {
  const config = readDashboardContentConfig();
  const wasActive = config.quotes.some((item) => item.id === id && item.isActive);
  config.quotes = config.quotes.filter((item) => item.id !== id);
  if (wasActive && config.quotes.length) config.quotes[0].isActive = true;
  writeDashboardContentConfig(config);
  redirect(res, `/motivation?notice=${encodeURIComponent("Đã xóa câu nói")}`);
}

async function uploadMotivationImage(req, res) {
  try {
    const { fields, files } = await readMultipartForm(req);
    const file = files.get("image");
    if (!file) throw new Error("Cần chọn file ảnh.");
    const { extension } = safeMotivationImage(file.filename);
    const title = String(fields.get("title") || "").trim();
    if (!title) throw new Error("Cần nhập tên ảnh.");
    const alt = String(fields.get("alt") || title).trim();
    const isActive = String(fields.get("isActive") || "") === "true";
    const storedName = `${crypto.randomUUID()}${extension}`;
    const uploadDirectory = motivationImagesDirectory();
    fs.mkdirSync(uploadDirectory, { recursive: true });
    fs.writeFileSync(path.join(uploadDirectory, storedName), file.buffer);
    const config = readDashboardContentConfig();
    if (isActive) config.images = config.images.map((item) => ({ ...item, isActive: false }));
    config.images.unshift({
      id: crypto.randomUUID(),
      title,
      alt,
      src: `/uploads/motivation/${storedName}`,
      isActive: isActive || config.images.length === 0,
      createdAt: new Date().toISOString(),
    });
    writeDashboardContentConfig(config);
    redirect(res, `/motivation?notice=${encodeURIComponent("Đã tải ảnh động lực lên")}`);
  } catch (error) {
    redirect(res, `/motivation?notice=${encodeURIComponent(error.message || "Không thể tải ảnh")}`);
  }
}

function activateMotivationImage(res, id) {
  const config = readDashboardContentConfig();
  config.images = config.images.map((item) => ({ ...item, isActive: item.id === id }));
  writeDashboardContentConfig(config);
  redirect(res, `/motivation?notice=${encodeURIComponent("Đã đổi ảnh mặc định trên dashboard")}`);
}

function deleteMotivationImage(res, id) {
  const config = readDashboardContentConfig();
  const target = config.images.find((item) => item.id === id);
  const wasActive = Boolean(target?.isActive);
  config.images = config.images.filter((item) => item.id !== id);
  if (wasActive && config.images.length) config.images[0].isActive = true;
  writeDashboardContentConfig(config);
  if (target?.src?.startsWith("/uploads/motivation/")) {
    fs.rmSync(path.join(process.cwd(), "public", target.src), { force: true });
  }
  redirect(res, `/motivation?notice=${encodeURIComponent("Đã xóa ảnh động lực")}`);
}

async function announcementsPage(user, notice) {
  const config = readAnnouncementConfig();
  const banner = config.banner || defaultAnnouncementConfig().banner;
  const historyRows = (config.history || []).slice(0, 20).map((item) =>
    row([
      `<strong>${escapeHtml(item.title || "-")}</strong><div class="mini-note">${escapeHtml(item.message || "")}</div>`,
      badge(item.type || "notice"),
      escapeHtml(item.href || "-"),
      item.enabled ? badge("Đang hiện") : badge("Ẩn"),
      escapeHtml(formatDate(item.createdAt || item.updatedAt)),
    ]),
  );

  const bannerForm = `<section class="card">
    <h1 style="font-size:26px">Cấu hình banner chung</h1>
    <div class="subtitle">Dùng cho kỳ thi mới, lịch bảo trì hoặc thư mục tài liệu học tập chung.</div>
    <form class="form" method="post" action="/announcements/banner" style="margin-top:14px">
      <div class="exam-create-grid">
        <label>Trạng thái<select name="enabled"><option value="true"${selected(String(Boolean(banner.enabled)), "true")}>Đang hiện</option><option value="false"${selected(String(Boolean(banner.enabled)), "false")}>Ẩn</option></select></label>
        <label>Loại thông báo<select name="type">${optionList([
          { value: "exam", label: "Kỳ thi mới" },
          { value: "maintenance", label: "Bảo trì" },
          { value: "documents", label: "Tài liệu chung" },
          { value: "notice", label: "Thông báo" },
        ], banner.type)}</select></label>
        <label>Đường dẫn<input name="href" value="${escapeHtml(banner.href || "")}" placeholder="/documents hoặc /exams" /></label>
        <label class="wide">Tiêu đề<input name="title" required value="${escapeHtml(banner.title || "")}" /></label>
        <label class="wide">Nội dung<textarea name="message" rows="3" required>${escapeHtml(banner.message || "")}</textarea></label>
      </div>
      <button type="submit">Lưu banner</button>
    </form>
  </section>`;

  const notifyForm = `<section class="card">
    <h1 style="font-size:26px">Gửi thông báo tới người dùng</h1>
    <div class="subtitle">Tạo notification trong chuông thông báo cho nhóm người dùng được chọn.</div>
    <form class="form" method="post" action="/announcements/broadcast" style="margin-top:14px">
      <div class="exam-create-grid">
        <label>Người nhận<select name="audience">
          <option value="ALL">Tất cả</option>
          <option value="STUDENT">Học sinh</option>
          <option value="TEACHER">Giáo viên</option>
          <option value="ADMIN">Admin</option>
        </select></label>
        <label>Đường dẫn<input name="href" placeholder="/documents, /exams, /vip..." /></label>
        <label class="wide">Tiêu đề<input name="title" required placeholder="Ví dụ: Có thư mục tài liệu Toán mới" /></label>
        <label class="wide">Nội dung<textarea name="message" rows="3" required placeholder="Nhập nội dung thông báo."></textarea></label>
      </div>
      <button type="submit">Gửi thông báo</button>
    </form>
  </section>`;

  const body = `${pageHeader("Banner / thông báo", "Đăng kỳ thi mới, lịch bảo trì hoặc chia sẻ thư mục tài liệu học tập chung.")}
  <div class="grid two">${bannerForm}${notifyForm}</div>
  <div style="margin-top:18px">${table(["Nội dung", "Loại", "Đường dẫn", "Trạng thái", "Ngày"], historyRows)}</div>`;
  return layout({ title: "Banner / thông báo", active: "/announcements", user, notice, body });
}

async function saveBanner(req, res) {
  const form = await readForm(req);
  const config = readAnnouncementConfig();
  const banner = {
    enabled: String(form.get("enabled") || "true") === "true",
    type: String(form.get("type") || "notice"),
    title: String(form.get("title") || "").trim(),
    message: String(form.get("message") || "").trim(),
    href: String(form.get("href") || "").trim(),
    updatedAt: new Date().toISOString(),
  };
  if (!banner.title || !banner.message) {
    redirect(res, `/announcements?notice=${encodeURIComponent("Thiếu tiêu đề hoặc nội dung banner")}`);
    return;
  }
  config.banner = banner;
  config.history = [{ ...banner, createdAt: banner.updatedAt }, ...(config.history || [])].slice(0, 50);
  writeAnnouncementConfig(config);
  redirect(res, `/announcements?notice=${encodeURIComponent("Đã lưu banner / thông báo chung")}`);
}

async function broadcastNotification(req, res) {
  const form = await readForm(req);
  const audience = String(form.get("audience") || "ALL");
  const title = String(form.get("title") || "").trim();
  const message = String(form.get("message") || "").trim();
  const href = String(form.get("href") || "").trim() || null;
  if (!title || !message) {
    redirect(res, `/announcements?notice=${encodeURIComponent("Thiếu tiêu đề hoặc nội dung thông báo")}`);
    return;
  }
  const where = ["STUDENT", "TEACHER", "ADMIN"].includes(audience) ? { role: audience } : {};
  const receivers = await prisma.user.findMany({ where, select: { id: true } });
  if (receivers.length) {
    await prisma.notification.createMany({
      data: receivers.map((receiver) => ({ userId: receiver.id, title, message, href })),
    });
  }
  redirect(res, `/announcements?notice=${encodeURIComponent(`Đã gửi thông báo tới ${receivers.length} tài khoản`)}`);
}

async function handleLogin(req, res) {
  const form = await readForm(req);
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user?.role === "ADMIN" && user.passwordHash && await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    sendHtml(res, loginPage("Email, mật khẩu hoặc quyền admin không đúng."), 401);
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, expires: Date.now() + 1000 * 60 * 60 * 12 });
  res.writeHead(303, {
    Location: "/",
    "Set-Cookie": `${sessionCookie}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`,
  });
  res.end();
}

async function deleteUser(req, res, id, current) {
  if (id !== current.id) {
    await prisma.user.delete({ where: { id } }).catch(() => undefined);
  }
  redirect(res, `/users?notice=${encodeURIComponent("Đã xóa tài khoản")}`);
}

async function updateUserRole(req, res, id, current) {
  const form = await readForm(req);
  const role = String(form.get("role") || "STUDENT");
  if (!["STUDENT", "TEACHER", "ADMIN"].includes(role)) {
    redirect(res, `/users?notice=${encodeURIComponent("Vai trò không hợp lệ")}`);
    return;
  }
  if (id === current.id && role !== "ADMIN") {
    redirect(res, `/users?notice=${encodeURIComponent("Không thể tự hạ quyền tài khoản đang đăng nhập")}`);
    return;
  }
  await prisma.user.update({ where: { id }, data: { role } }).catch(() => undefined);
  redirect(res, `/users?notice=${encodeURIComponent("Đã cập nhật vai trò")}`);
}

async function updateUserBalance(req, res, id) {
  const form = await readForm(req);
  const coins = Math.max(0, Math.floor(Number(form.get("coins") || 0)));
  const exp = Math.max(0, Math.floor(Number(form.get("exp") || 0)));
  await prisma.user.update({ where: { id }, data: { coins, exp } }).catch(() => undefined);
  redirect(res, `/users?notice=${encodeURIComponent("Đã cập nhật Coin và EXP")}`);
}

async function createExam(req, res) {
  const form = await readForm(req);
  const subjectId = String(form.get("subjectId") || "");
  const educationLevel = String(form.get("educationLevel") || "THCS");
  const grade = String(form.get("grade") || "").trim();
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim();
  const type = String(form.get("type") || "PRACTICE");
  const contentMode = String(form.get("contentMode") || "topics");
  const accessLevel = String(form.get("accessLevel") || "FREE");
  const durationMinutes = Math.max(1, Math.floor(Number(form.get("durationMinutes") || 30)));
  const year = Math.max(2020, Math.floor(Number(form.get("year") || new Date().getFullYear())));
  const targetScore = Number(form.get("targetScore") || 8);

  if (!title || !subjectId || !["THCS", "THPT", "EXAM_10", "THPTQG"].includes(educationLevel)) {
    redirect(res, `/exams?notice=${encodeURIComponent("Thiếu cấp học, môn học hoặc tiêu đề đề thi")}`);
    return;
  }
  if (!["PRACTICE", "MOCK", "PREDICTION"].includes(type) || !["FREE", "PRO"].includes(accessLevel)) {
    redirect(res, `/exams?notice=${encodeURIComponent("Loại đề hoặc quyền truy cập không hợp lệ")}`);
    return;
  }
  if (!["topics", "exams", "theory"].includes(contentMode)) {
    redirect(res, `/exams?notice=${encodeURIComponent("Loại nội dung không hợp lệ")}`);
    return;
  }

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    redirect(res, `/exams?notice=${encodeURIComponent("Không tìm thấy môn học")}`);
    return;
  }

  const importSource = String(form.get("bulkQuestions") || "").trim();
  let parsedQuestions = [];
  try {
    if (!importSource) throw new Error("Vui lòng tải file hoặc dán nội dung import để tạo đề.");
    parsedQuestions = parseQuestionsFromImport(importSource);
  } catch (error) {
    redirect(res, `/exams?notice=${encodeURIComponent(error?.message || "Không đọc được cấu trúc đề thi")}`);
    return;
  }

  if (!parsedQuestions.length) {
    redirect(res, `/exams?notice=${encodeURIComponent("Đề thi cần ít nhất 1 câu hỏi")}`);
    return;
  }
  if (parsedQuestions.length > 100) {
    redirect(res, `/exams?notice=${encodeURIComponent("Mỗi lần tạo tối đa 100 câu hỏi")}`);
    return;
  }

  const questions = parsedQuestions.map(toQuestionCreate);

  const stamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  const code = `ADM-${subject.slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${stamp}-${random}`;
  const slug = `${slugify(title)}-${stamp.toLowerCase()}-${random.toLowerCase()}`;

  const exam = await prisma.exam.create({
    data: {
      code,
      slug,
      title,
      description: description || `Đề ${subject.name} được tạo từ Ava Admin theo luồng ${grade || educationLevel}.`,
      family: subject.family,
      type,
      accessLevel,
      year,
      durationMinutes,
      educationLevel,
      examStructure: {
        source: "admin-server",
        grade,
        contentMode,
        contentModeLabel: examContentModeLabel(contentMode),
        questionSource: "file-import",
        formulaSyntax: "latex-dollar",
        questionCount: questions.length,
        flowLabel: studyFlows.find((flow) => flow.id === educationLevel)?.label ?? educationLevel,
      },
      targetScore: Number.isFinite(targetScore) ? targetScore : 8,
      subjectId: subject.id,
      questions: { create: questions },
    },
  });

  redirect(res, `/exams?notice=${encodeURIComponent(`Đã tạo đề "${exam.title}" cho môn ${subject.name}`)}#tao-de-theo-mon`);
}

async function deleteExam(res, id) {
  try {
    const exam = await prisma.exam.findUnique({ where: { id }, select: { title: true } });
    if (!exam) {
      redirect(res, `/exams?notice=${encodeURIComponent("Không tìm thấy đề thi để xóa")}`);
      return;
    }
    await prisma.exam.delete({ where: { id } });
    redirect(res, `/exams?notice=${encodeURIComponent(`Đã xóa đề "${exam.title}"`)}`);
  } catch (error) {
    redirect(res, `/exams?notice=${encodeURIComponent(error.message || "Không thể xóa đề thi")}`);
  }
}

async function previewExamImport(req, res) {
  const form = await readForm(req);
  const importSource = String(form.get("bulkQuestions") || "").trim();
  try {
    const questions = importSource ? parseQuestionsFromImport(importSource) : [];
    sendJson(res, {
      ok: true,
      questions: questions.map((question) => ({
        prompt: question.prompt,
        answers: question.answers,
        correct: question.correct,
        explanation: question.explanation,
      })),
    });
  } catch (error) {
    sendJson(res, { ok: false, error: error?.message || "Không đọc được nội dung import." }, 400);
  }
}

async function router(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || `localhost:${port}`}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/health") {
    sendText(res, "ok");
    return;
  }

  if (pathname === "/login" && req.method === "GET") {
    sendHtml(res, loginPage());
    return;
  }

  if (pathname === "/login" && req.method === "POST") {
    await handleLogin(req, res);
    return;
  }

  const user = await currentUser(req);
  if (!user) {
    redirect(res, "/login");
    return;
  }

  if (pathname === "/logout" && req.method === "POST") {
    const token = parseCookies(req)[sessionCookie];
    if (token) sessions.delete(token);
    res.writeHead(303, {
      Location: "/login",
      "Set-Cookie": `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
    });
    res.end();
    return;
  }

  const notice = url.searchParams.get("notice") || "";

  if (pathname === "/" && req.method === "GET") return sendHtml(res, await dashboardPage(user, notice));
  if (pathname === "/users" && req.method === "GET") return sendHtml(res, await usersPage(user, notice, url));
  if (pathname === "/users/export.xlsx" && req.method === "GET") return exportUsersExcel(res);
  if (pathname.startsWith("/users/") && pathname.endsWith("/role") && req.method === "POST") {
    return redirect(res, `/users?notice=${encodeURIComponent("Vai trò tài khoản đang để cố định, admin không chỉnh tại đây")}`);
  }
  if (pathname.startsWith("/users/") && pathname.endsWith("/balance") && req.method === "POST") {
    return redirect(res, `/users?notice=${encodeURIComponent("Đã bỏ quản lý Coin / EXP khỏi trang người dùng")}`);
  }
  if (pathname.startsWith("/users/") && pathname.endsWith("/vip") && req.method === "POST") {
    const id = pathname.split("/")[2];
    return upgradeUserVip(req, res, id);
  }
  if (pathname.startsWith("/users/") && pathname.endsWith("/delete") && req.method === "POST") {
    const id = pathname.split("/")[2];
    return deleteUser(req, res, id, user);
  }
  if (pathname === "/exams/create" && req.method === "POST") return createExam(req, res);
  if (pathname === "/exams/preview" && req.method === "POST") return previewExamImport(req, res);
  if (pathname.startsWith("/exams/") && pathname.endsWith("/delete") && req.method === "POST") {
    return deleteExam(res, pathname.split("/")[2]);
  }
  if (pathname === "/exams" && req.method === "GET") return sendHtml(res, await examsPage(user, notice));
  if (pathname.startsWith("/announcements")) return redirect(res, `/store-items?notice=${encodeURIComponent("Đã thay Banner / thông báo bằng trang quản lý cửa hàng")}`);
  if (pathname === "/documents" && req.method === "GET") return sendHtml(res, await documentsPage(user, notice));
  if (pathname === "/documents/upload" && req.method === "POST") return uploadDocument(req, res, user);
  if (pathname.startsWith("/documents/") && pathname.endsWith("/file") && req.method === "GET") {
    return sendDocumentFile(res, pathname.split("/")[2]);
  }
  if (pathname.startsWith("/documents/") && pathname.endsWith("/delete") && req.method === "POST") {
    return deleteDocument(req, res, pathname.split("/")[2]);
  }
  if (pathname.startsWith("/documents/") && req.method === "GET") {
    return sendHtml(res, await documentDetailPage(user, notice, pathname.split("/")[2]));
  }
  if (pathname === "/payments" && req.method === "GET") return sendHtml(res, await paymentsPage(user, notice, url));
  if (pathname === "/plans" && req.method === "GET") return redirect(res, "/payments");
  if (pathname === "/plans/create" && req.method === "POST") return createPlan(req, res);
  if (pathname.startsWith("/plans/") && pathname.endsWith("/toggle") && req.method === "POST") {
    return togglePlan(res, pathname.split("/")[2]);
  }
  if (pathname.startsWith("/payments/") && pathname.endsWith("/status") && req.method === "POST") {
    return updatePaymentStatus(req, res, pathname.split("/")[2]);
  }
  if (pathname === "/store-items" && req.method === "GET") return sendHtml(res, await storeItemsPage(user, notice));
  if (pathname === "/store-items/create" && req.method === "POST") return createStoreItem(req, res);
  if (pathname.startsWith("/store-items/") && pathname.endsWith("/update") && req.method === "POST") {
    return updateStoreItem(req, res, pathname.split("/")[2]);
  }
  if (pathname.startsWith("/store-items/") && pathname.endsWith("/delete") && req.method === "POST") {
    return deleteStoreItem(req, res, pathname.split("/")[2]);
  }
  if (pathname === "/motivation" && req.method === "GET") return sendHtml(res, await motivationPage(user, notice));
  if (pathname === "/motivation/quotes/create" && req.method === "POST") return createMotivationQuote(req, res);
  if (pathname.startsWith("/motivation/quotes/") && pathname.endsWith("/activate") && req.method === "POST") {
    return activateMotivationQuote(res, pathname.split("/")[3]);
  }
  if (pathname.startsWith("/motivation/quotes/") && pathname.endsWith("/delete") && req.method === "POST") {
    return deleteMotivationQuote(res, pathname.split("/")[3]);
  }
  if (pathname === "/motivation/images/upload" && req.method === "POST") return uploadMotivationImage(req, res);
  if (pathname.startsWith("/motivation/images/") && pathname.endsWith("/activate") && req.method === "POST") {
    return activateMotivationImage(res, pathname.split("/")[3]);
  }
  if (pathname.startsWith("/motivation/images/") && pathname.endsWith("/delete") && req.method === "POST") {
    return deleteMotivationImage(res, pathname.split("/")[3]);
  }

  sendHtml(res, layout({ title: "Không tìm thấy", active: "", user, body: pageHeader("Không tìm thấy", "Địa chỉ admin không tồn tại.") }), 404);
}

const server = http.createServer((req, res) => {
  router(req, res).catch((error) => {
    console.error(error);
    sendHtml(res, `<pre>${escapeHtml(error.stack || error.message)}</pre>`, 500);
  });
});

server.listen(port, process.env.ADMIN_HOST || "127.0.0.1", () => {
  console.log(`Ava admin server ready: http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
