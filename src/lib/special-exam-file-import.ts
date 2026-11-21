import { rowsToObjects } from "@/lib/spreadsheet-import";
import { isSafeRichImageUrl } from "@/lib/rich-image-security";
import { latexErrors, withExplicitLatex, hasCorruptedPdfMath } from "@/lib/math-latex";
import type { AssessmentQuestionType } from "@/lib/special-exam-rules";

export type ImportedAssessmentQuestion = {
  type: AssessmentQuestionType;
  blockKey: string;
  prompt: string;
  options?: string[];
  correct?: "A" | "B" | "C" | "D";
  correctText?: string;
  statements?: { content: string; isCorrect: boolean }[];
  passage?: string;
  explanation?: string;
};

export type AssessmentSheetBlock = {
  key: string;
  start: number;
  end: number;
  questionType: AssessmentQuestionType;
  requiredShortAnswers?: number;
};

const normalized = (name: string) => name.toLocaleLowerCase("vi").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");

function readField(row: Record<string, unknown>, names: string[]): string {
  const columns = new Map(Object.entries(row).map(([key, value]) => [normalized(key), String(value ?? "").trim()]));
  for (const alias of names) {
    const content = columns.get(normalized(alias));
    if (content) return content;
  }
  return "";
}

function kind(raw: string, defaultKind: AssessmentQuestionType, answer: string, options: string[]): AssessmentQuestionType {
  if (raw) {
    const token = normalized(raw);
    if (["singlechoice", "multiplechoice", "tracnghiem", "tracnghiem4dapan", "chon1dapan", "mcq"].includes(token)) return "SINGLE_CHOICE";
    if (["shortanswer", "numeric", "numerical", "diendapan", "dienso", "traloingan", "dienketqua", "tudien"].includes(token)) return "SHORT_ANSWER";
    if (["truefalseset", "truefalse", "dungsai", "tracnghiemdungsai"].includes(token)) return "TRUE_FALSE_SET";
    if (["essay", "tuluan"].includes(token)) return "ESSAY";
    throw new Error("Dạng câu không được hỗ trợ: " + raw + ".");
  }
  // Only infer from complete, unambiguous evidence; never invent choices.
  if (options.some(Boolean) || /^[A-D]$/i.test(answer)) return "SINGLE_CHOICE";
  if (answer && !options.some(Boolean)) return "SHORT_ANSWER";
  return defaultKind;
}

function correctLetter(raw: string, choices: string[]): ImportedAssessmentQuestion["correct"] | undefined {
  const answer = raw.trim();
  if (/^[A-D][.)]?$/.test(answer.toUpperCase())) return answer.charAt(0).toUpperCase() as ImportedAssessmentQuestion["correct"];
  const exact = choices.findIndex((value) => value && normalized(value) === normalized(answer));
  return exact < 0 ? undefined : "ABCD"[exact] as ImportedAssessmentQuestion["correct"];
}

/**
 * Parse a teacher's existing Excel/CSV sheet without rewriting its questions.
 * Issues may be imported into an UNPUBLISHED draft for correction in Educhi;
 * official publication must still pass the strict exam validator.
 */
export function parseAssessmentRows(
  rows: readonly (readonly unknown[])[],
  blocks: readonly AssessmentSheetBlock[],
  passageRows?: readonly (readonly unknown[])[],
  embedded = new Map<number, string[]>(),
): { questions: ImportedAssessmentQuestion[]; warnings: string[] } {
  if (!rows.length) throw new Error("File không chứa dữ liệu câu hỏi.");
  const passages = new Map<string, string>();
  const warnings: string[] = [];

  if (passageRows) {
    for (const [index, row] of rowsToObjects(passageRows).entries()) {
      if (!Object.values(row).some((value) => String(value ?? "").trim())) continue;
      const key = readField(row, ["group_id", "group id", "mã bài đọc"]).toUpperCase();
      const passage = readField(row, ["passage", "nội dung bài đọc", "ngữ liệu", "đoạn văn"]);
      if (!key || !passage) throw new Error("BAI_DOC dòng " + (index + 2) + " thiếu group_id hoặc passage.");
      if (passages.has(key)) throw new Error("BAI_DOC bị trùng group_id: " + key);
      const title = readField(row, ["title", "tiêu đề"]);
      const instruction = readField(row, ["instruction", "hướng dẫn", "yêu cầu"]);
      passages.set(key, [title, instruction, passage].filter(Boolean).join("\n\n"));
    }
  }

  const records = rowsToObjects(rows);
  const numbered = records.map((row, offset) => ({ row, rowNumber: offset + 2 }))
    .filter(({ row, rowNumber }) => Object.values(row).some((value) => String(value ?? "").trim()) || embedded.has(rowNumber));
  if (!numbered.length) throw new Error("Sheet câu hỏi không có câu nào.");
  if (numbered.length > 200) throw new Error("Đề kỳ thi riêng hỗ trợ tối đa 200 câu.");
  if (numbered.length !== records.length) warnings.push("Đã bỏ qua " + (records.length - numbered.length) + " dòng trống; hãy kiểm tra thứ tự câu.");
  let sourceNumberDiffers = false;
  const questions = numbered.map(({ row, rowNumber }, index) => {
    const position = index + 1;
    const block = blocks.find((item) => position >= item.start && position <= item.end);
    if (!block) throw new Error("File có nhiều câu hơn cấu trúc đề đã chọn.");
    const originalNumber = readField(row, ["no", "stt", "số câu", "câu số", "number"]);
    if (originalNumber && Number(originalNumber) !== position) sourceNumberDiffers = true;
    const options = ["A", "B", "C", "D"].map((letter) => readField(row, [letter, "option " + letter, "phương án " + letter, "đáp án " + letter]));
    const answer = readField(row, ["correct", "answer", "đáp án đúng", "đáp án", "correctText", "đáp án điền số"]);
    let type: AssessmentQuestionType;
    try {
      type = kind(readField(row, ["type", "dạng câu", "loại câu", "kiểu câu", "question type"]), block.questionType, answer, options);
    } catch (error) {
      throw new Error("Dòng " + rowNumber + ": " + (error instanceof Error ? error.message : "Dạng câu không hợp lệ."));
    }

    const promptText = readField(row, ["question", "prompt", "câu hỏi", "nội dung câu hỏi", "đề bài"]);
    const latex = readField(row, ["math_latex", "formula_latex", "latex", "công thức latex", "latex công thức"]);
    if (!promptText && !latex) throw new Error("Dòng " + rowNumber + " (câu " + position + ") thiếu nội dung câu hỏi.");
    const images = [...(embedded.get(rowNumber) ?? [])];
    const linkedImage = readField(row, ["image", "ảnh", "hình ảnh", "image url"]);
    if (linkedImage) {
      if (isSafeRichImageUrl(linkedImage)) images.push(linkedImage);
      else warnings.push("Câu " + position + ": đường dẫn ảnh không an toàn hoặc không hợp lệ; đã bỏ qua liên kết ảnh ngoài.");
    }
    const withFormula = withExplicitLatex(promptText, latex);
    if (hasCorruptedPdfMath(promptText) && images.length === 0) {
      warnings.push("Câu " + position + " có ký tự toán học lỗi từ PDF và không có ảnh gốc; cần sửa công thức bằng LaTeX trước khi xuất bản.");
    }
    for (const issue of latexErrors(withFormula)) {
      warnings.push("Câu " + position + ": công thức LaTeX lỗi: " + issue);
    }
    const prompt = withFormula + images.map((url) => "\n![Hình minh họa](" + url + ")").join("");
    const groupId = readField(row, ["group_id", "group id", "mã bài đọc"]).toUpperCase();
    if (groupId && !passages.has(groupId) && !readField(row, ["passage", "ngữ liệu", "bài đọc"])) {
      throw new Error("Câu " + position + ": group_id " + groupId + " không tồn tại trong BAI_DOC.");
    }
    const passage = (groupId && passages.get(groupId)) || readField(row, ["passage", "ngữ liệu", "bài đọc"]);
    const explanation = readField(row, ["explanation", "giải thích", "lời giải"]);
    if (hasCorruptedPdfMath(explanation)) {
      warnings.push("Câu " + position + ": lời giải trích từ PDF có ký tự toán học bị lỗi; cần đối chiếu nguồn và viết lại bằng LaTeX.");
    }
    for (const issue of latexErrors(explanation)) {
      warnings.push("Câu " + position + ": lời giải có LaTeX lỗi: " + issue);
    }
    const result: ImportedAssessmentQuestion = {
      type, blockKey: block.key, prompt,
      ...(passage ? { passage } : {}),
      ...(explanation ? { explanation } : {}),
    };
    if (type === "SINGLE_CHOICE") {
      result.options = options;
      result.correct = correctLetter(answer, options);
      for (const [choiceIndex, option] of options.entries()) {
        for (const issue of latexErrors(option)) warnings.push("Câu " + position + ", lựa chọn " + "ABCD"[choiceIndex] + ": " + issue);
      }
      if (options.some((choice) => !choice)) {
        warnings.push("Câu " + position + " (dòng " + rowNumber + ") thiếu " +
          options.map((choice, i) => !choice ? "ABCD"[i] : "").filter(Boolean).join(", ") + "; giữ nguyên để sửa trong Educhi.");
      }
      if (!result.correct) warnings.push("Câu " + position + ": đáp án A–D chưa hợp lệ; cần kiểm tra.");
    } else if (type === "SHORT_ANSWER") {
      result.correctText = readField(row, ["correctText", "đáp án điền số", "đáp án ngắn", "correct", "answer", "đáp án"]);
      if (!result.correctText) warnings.push("Câu " + position + ": câu điền đáp án chưa có đáp án.");
    } else if (type === "TRUE_FALSE_SET") {
      result.statements = options.map((content, i) => {
        const letter = "ABCD"[i];
        const value = readField(row, ["correct" + letter, "đúng sai " + letter, "answer " + letter]);
        const key = normalized(value);
        if (!["d", "dung", "true", "1", "s", "sai", "false", "0"].includes(key) || !content) {
          throw new Error("Câu " + position + ": Đúng/Sai cần đủ 4 nhận định và đáp án riêng cho từng nhận định.");
        }
        return { content, isCorrect: ["d", "dung", "true", "1"].includes(key) };
      });
    }
    return result;
  });
  if (sourceNumberDiffers) {
    warnings.push("Số thứ tự nguồn có chỗ khác thứ tự 1–" + questions.length +
      "; Educhi sẽ đánh số liên tục theo thứ tự các dòng, không sửa nội dung câu.");
  }
  for (const rowNumber of embedded.keys()) {
    if (!numbered.some((record) => record.rowNumber === rowNumber)) {
      warnings.push("Ảnh Excel ở dòng " + rowNumber + " không thuộc câu hỏi nào.");
    }
  }
  return { questions, warnings };
}
