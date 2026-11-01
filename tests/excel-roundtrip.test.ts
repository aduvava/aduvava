import { describe, it } from "node:test";
import assert from "node:assert/strict";
import writeExcelFile from "write-excel-file/node";
import { readSheet } from "read-excel-file/node";
import { rowsToObjects } from "../src/lib/spreadsheet-import";

describe("XLSX import/export compatibility", () => {
  it("writes a Vietnamese exam template and reads it back without losing answers", async () => {
    const sheet = [
      ["question", "A", "B", "correct", "explanation"],
      ["Câu 1: Phương trình x²=4?", "2", "3", "A", "Vì x = ±2"],
      ["Câu 2: 5 + 7?", "11", "12", "B", "Tổng là 12"],
    ];
    const buffer = await writeExcelFile(sheet).toBuffer();
    assert.ok(buffer.byteLength > 100);
    const parsed = await readSheet(buffer);
    const questions = rowsToObjects(parsed);
    assert.equal(questions.length, 2);
    assert.equal(questions[0].question, sheet[1][0]);
    assert.equal(questions[0].correct, "A");
    assert.equal(questions[1].B, "12");
    assert.equal(questions[1].explanation, "Tổng là 12");
  });
});
