import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAdminExamRows, parseAdminExamText } from "../src/lib/admin-exam-file-import";
import { parseDelimited } from "../src/lib/spreadsheet-import";

describe("admin exam file upload", () => {
  it("parses Vietnamese TXT with four options, key and explanations", () => {
    const questions = parseAdminExamText(`Câu 1: Giống vật nuôi là gì?
A. Một nhóm cây trồng
B. Quần thể vật nuôi cùng loài và nguồn gốc
C. Một loại thuốc thú y
D. Một hình thức chăn thả
Đáp án: B
Giải thích: Giống vật nuôi có cùng nguồn gốc.

Câu 2: Lai giống là gì?
A. Cho ăn tự do
B. Nuôi nhốt
C. Giao phối giữa các con thuộc giống khác nhau
D. Tiêm phòng
Đáp án: C`);
    assert.equal(questions.length, 2);
    assert.equal(questions[0].correctIndex, 1);
    assert.equal(questions[1].correctIndex, 2);
    assert.match(questions[0].explanation, /cùng nguồn gốc/);
  });

  it("imports CSV columns in the same order as the Educhi spreadsheet template", () => {
    const csv = 'question,A,B,C,D,correct,explanation\n"Bò Holstein có hướng sản xuất nào?","Sữa","Trứng","Lông","Sức kéo",A,"Bò sữa"\n';
    const questions = parseAdminExamRows(parseDelimited(csv));
    assert.equal(questions.length, 1);
    assert.deepEqual(questions[0].options, ["Sữa", "Trứng", "Lông", "Sức kéo"]);
    assert.equal(questions[0].correctIndex, 0);
  });

  it("rejects missing answers or partially formed questions rather than silently dropping them", () => {
    assert.throws(() => parseAdminExamText("Câu 1: Thiếu đáp án?\nA. Một\nB. Hai\nC. Ba\nD. Bốn"), /Câu 1/);
    assert.throws(() => parseAdminExamRows([
      ["question", "A", "B", "C", "D", "correct"],
      ["Câu không đủ", "A", "B", "C", "", "A"],
    ]), /Câu 1/);
    assert.throws(() => parseAdminExamText("Tệp không có định dạng câu hỏi"), /Câu 1/);
  });
});
