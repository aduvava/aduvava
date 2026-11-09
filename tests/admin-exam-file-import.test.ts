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

  it("links multiple questions to one shared reading passage from two sheets", () => {
    const passages = [
      ["group_id", "type", "title", "instruction", "passage"],
      ["RD01", "READING", "Reading 1", "Read the passage.", "Online platforms help students learn."],
      ["CL01", "CLOZE", "Cloze 1", "Choose the correct word.", "Learning is (3) ____."],
    ];
    const questions = [
      ["no", "group_id", "question", "A", "B", "C", "D", "correct", "explanation"],
      [1, "RD01", "What helps students?", "Books", "Online platforms", "Games", "Sports", "B", ""],
      [2, "RD01", "Who benefits?", "Students", "Parents", "Drivers", "Chefs", "A", ""],
      [3, "CL01", "Which word fits blank 3?", "harmful", "useful", "late", "short", "B", ""],
      [4, "", "She ___ to school.", "go", "goes", "gone", "going", "B", ""],
    ];
    const parsed = parseAdminExamRows(questions, passages);
    assert.equal(parsed.length, 4);
    assert.equal(parsed[0].passage, parsed[1].passage);
    assert.match(parsed[0].passage ?? "", /Reading 1/);
    assert.match(parsed[2].passage ?? "", /Cloze 1/);
    assert.equal(parsed[3].passage, undefined);
  });

  it("rejects unknown and duplicate reading group IDs", () => {
    const questions = [["question","group_id","A","B","C","D","correct"],["Why?","RD02","One","Two","Three","Four","A"]];
    const passage = [["group_id","passage"],["RD01","Some passage"]];
    assert.throws(() => parseAdminExamRows(questions, passage), /RD02/);
    assert.throws(() => parseAdminExamRows(questions, [["group_id","passage"],["RD02","Text"],["RD02","Duplicate"]]), /Trùng group_id/);
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
