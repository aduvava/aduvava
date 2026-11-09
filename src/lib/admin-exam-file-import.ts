import { parseDelimited, rowsToObjects } from "@/lib/spreadsheet-import";

export type ImportedExamQuestion = {
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  passage?: string;
};

const normalize = (value: string) => value.toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[\s_-]+/g, "");

function getField(row: Record<string, unknown>, aliases: string[]) {
  const fields = new Map(Object.entries(row).map(([key, value]) => [normalize(key), String(value ?? "").trim()]));
  return aliases.map((alias) => fields.get(normalize(alias)) ?? "").find(Boolean) ?? "";
}

function makeQuestion(prompt: string, options: string[], answer: string, explanation: string, index: number): ImportedExamQuestion {
  const question = prompt.trim();
  const choices = options.map((option) => option.trim());
  const letter = answer.trim().toUpperCase();
  const correctIndex = /^[A-D]$/.test(letter)
    ? letter.charCodeAt(0) - 65
    : choices.findIndex((option) => normalize(option) === normalize(answer.trim()));
  if (!question || choices.length !== 4 || choices.some((option) => !option) || correctIndex < 0) {
    throw new Error(`Câu ${index}: cần đủ nội dung, 4 phương án A–D và đáp án đúng (A, B, C hoặc D).`);
  }
  return { prompt: question, options: choices as ImportedExamQuestion["options"], correctIndex, explanation: explanation.trim() };
}

export function parseAdminExamText(text: string): ImportedExamQuestion[] {
  const blocks = text.replace(/\r/g, "").replace(/^\uFEFF/, "")
    .split(/(?=^(?:Câu|Cau|Question)\s*\d+\s*[:.)-])/gim)
    .map((block) => block.trim()).filter(Boolean);
  if (!blocks.length) throw new Error("Không tìm thấy câu hỏi trong file TXT.");
  const results = blocks.map((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!/^(?:Câu|Cau|Question)\s*\d+\s*[:.)-]/i.test(lines[0] ?? "")) {
      throw new Error("File TXT cần bắt đầu bằng 'Câu 1:' và theo đúng mẫu.");
    }
    const prompt: string[] = [lines[0].replace(/^(?:Câu|Cau|Question)\s*\d+\s*[:.)-]\s*/i, "")];
    const options: Record<string, string> = {};
    const explanations: string[] = [];
    let answer = "";
    let readingExplanation = false;
    for (const line of lines.slice(1)) {
      const option = line.match(/^([A-D])\s*[.):]\s*(.+)$/i);
      const correct = line.match(/^(?:Đáp án|Dap an|Correct|Answer)\s*[:\-]\s*(.+)$/i);
      const explain = line.match(/^(?:Giải thích|Giai thich|Explanation)\s*[:\-]\s*(.*)$/i);
      const image = line.match(/^(?:Ảnh|Anh|Hình|Hinh|Image)\s*[:\-]\s*(.+)$/i);
      if (option) { options[option[1].toUpperCase()] = option[2].trim(); readingExplanation = false; }
      else if (correct) { answer = correct[1].trim(); readingExplanation = false; }
      else if (explain) { readingExplanation = true; explanations.push(explain[1].trim()); }
      else if (image && !readingExplanation) prompt.push(`![Minh họa](${image[1].trim()})`);
      else if (readingExplanation) explanations.push(line);
      else if (Object.keys(options).length === 0) prompt.push(line);
      else throw new Error(`Câu ${index + 1}: dòng không hợp lệ: ${line.slice(0, 80)}`);
    }
    return makeQuestion(prompt.join("\n"), ["A", "B", "C", "D"].map((key) => options[key] ?? ""), answer, explanations.join("\n"), index + 1);
  });
  if (results.length > 2000) throw new Error("Chỉ nhập tối đa 2.000 câu mỗi lần.");
  return results;
}


/** Reads one passage per group, rather than requiring the same passage on every question row. */
export function parseAdminExamRows(
  rows: readonly (readonly unknown[])[],
  passageRows?: readonly (readonly unknown[])[],
): ImportedExamQuestion[] {
  const passages = new Map<string, string>();
  if (passageRows) {
    const records = rowsToObjects(passageRows);
    if (records.length > 100) throw new Error("Mỗi file chỉ hỗ trợ tối đa 100 nhóm ngữ liệu.");
    for (const [index, row] of records.entries()) {
      if (!Object.values(row).some((value) => String(value ?? "").trim())) continue;
      const groupId = getField(row, ["group_id", "group id", "mã bài đọc", "ma bai doc"]).toUpperCase();
      const content = getField(row, ["passage", "ngữ liệu", "noi dung bai doc", "nội dung bài đọc", "đoạn văn"]);
      const title = getField(row, ["title", "tiêu đề", "tieu de"]);
      const instruction = getField(row, ["instruction", "hướng dẫn", "yeu cau", "yêu cầu"]);
      if (!groupId || !content) throw new Error("BAI_DOC dòng " + (index + 2) + ": cần group_id và passage.");
      if (passages.has(groupId)) throw new Error("Trùng group_id trong BAI_DOC: " + groupId);
      const reading = [title, instruction, content].filter(Boolean).join("\n\n");
      if (reading.length > 50000) throw new Error("Bài đọc " + groupId + " vượt quá 50.000 ký tự.");
      passages.set(groupId, reading);
    }
  }
  const records = rowsToObjects(rows);
  const results: ImportedExamQuestion[] = [];
  const usedGroups = new Set<string>();
  for (const row of records) {
    if (!Object.values(row).some((value) => String(value ?? "").trim())) continue;
    const question = getField(row, ["question", "prompt", "câu hỏi", "noi dung cau hoi", "nội dung câu hỏi"]);
    const image = getField(row, ["image", "ảnh", "hình ảnh"]);
    const options = ["A", "B", "C", "D"].map((letter) => getField(row, [letter, "option " + letter, "đáp án " + letter]));
    const answer = getField(row, ["correct", "answer", "đáp án đúng", "đáp án"]);
    const explanation = getField(row, ["explanation", "giải thích", "lời giải"]);
    const groupId = getField(row, ["group_id", "group id", "mã bài đọc", "ma bai doc"]).toUpperCase();
    const directPassage = getField(row, ["passage", "ngữ liệu", "đoạn văn"]);
    if (groupId && !passages.has(groupId)) {
      throw new Error("Câu " + (results.length + 1) + ": group_id " + groupId + " chưa có trong sheet BAI_DOC.");
    }
    if (groupId) usedGroups.add(groupId);
    const item = makeQuestion(image ? question + "\n![Minh họa](" + image + ")" : question, options, answer, explanation, results.length + 1);
    const passage = groupId ? passages.get(groupId) : directPassage;
    if (passage) item.passage = passage;
    results.push(item);
  }
  if (!results.length) throw new Error("File bảng tính không có câu hỏi. Cần cột question, A, B, C, D, correct.");
  if (results.length > 2000) throw new Error("Chỉ nhập tối đa 2.000 câu mỗi lần.");
  for (const groupId of passages.keys()) {
    if (!usedGroups.has(groupId)) throw new Error("Nhóm " + groupId + " ở BAI_DOC chưa được câu hỏi nào sử dụng.");
  }
  return results;
}

export async function importAdminExamFile(file: File): Promise<ImportedExamQuestion[]> {
  if (file.size > 5 * 1024 * 1024) throw new Error("File tối đa 5 MB.");
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) return parseAdminExamText(await file.text());
  if (name.endsWith(".csv") || name.endsWith(".tsv")) {
    return parseAdminExamRows(parseDelimited(await file.text(), name.endsWith(".tsv") ? "\t" : ","));
  }
  if (name.endsWith(".xlsx")) {
    const { default: readWorkbook } = await import("read-excel-file/browser");
    const sheets = await readWorkbook(file);
    const questionsSheet = sheets.find((sheet) => normalize(sheet.sheet) === "cauhoi");
    const passagesSheet = sheets.find((sheet) => normalize(sheet.sheet) === "baidoc");
    if (passagesSheet && !questionsSheet) {
      throw new Error("File có sheet BAI_DOC thì phải có sheet CAU_HOI.");
    }
    return parseAdminExamRows(
      questionsSheet?.data ?? sheets[0].data,
      passagesSheet?.data,
    );
  }
  throw new Error("Chỉ hỗ trợ tệp TXT, CSV, TSV hoặc XLSX.");
}
