import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDelimited, rowsToObjects } from "../src/lib/spreadsheet-import";

describe("spreadsheet import", () => {
  it("handles Vietnamese UTF-8 headers and quoted multiline cells", () => {
    const text = '\uFEFF"câu hỏi","A","B","correct"\r\n"Câu 1, phần 1\nphần 2","1","2","B"\r\n';
    assert.deepEqual(rowsToObjects(parseDelimited(text)), [{
      "câu hỏi": "Câu 1, phần 1\nphần 2", A: "1", B: "2", correct: "B",
    }]);
  });
  it("handles escaped quotes and TSV imports", () => {
    assert.deepEqual(parseDelimited('"A""B",C'), [['A"B', "C"]]);
    assert.deepEqual(parseDelimited("question\tA\tB\nQ\tYes\tNo", "\t"), [
      ["question", "A", "B"], ["Q", "Yes", "No"],
    ]);
  });
  it("rejects malformed and unreasonably large files", () => {
    assert.throws(() => parseDelimited('"not closed'));
    assert.throws(() => parseDelimited("a".repeat(2_000_001)));
    assert.throws(() => rowsToObjects([Array(61).fill("x")]));
  });
});
