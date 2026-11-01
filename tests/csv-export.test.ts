import { describe, it } from "node:test";
import assert from "node:assert/strict";
// Admin service is CommonJS; test it without running the HTTP server.
const { createCsv, safeCsvCell } = require("../admin-server/csv-export.js");

describe("CSV export security", () => {
  it("quotes commas, newlines and double quotes", () => {
    assert.equal(safeCsvCell('A,"B"\nC'), '"A,""B""\nC"');
  });

  it("prevents Excel formula injection including leading whitespace", () => {
    for (const input of ['=1+2', '+SUM(1,1)', '-10+20', '@SUM(A1:A2)', '   =cmd']) {
      assert.equal(safeCsvCell(input), '"\'' + input + '"');
    }
  });

  it("exports a UTF-8 BOM and CRLF rows with stable column order", () => {
    const csv = createCsv(["Tên", "Email"], [{ Email: "student@example.com", "Tên": "Học sinh" }]);
    assert.equal(csv, '\uFEFF"Tên","Email"\r\n"Học sinh","student@example.com"\r\n');
  });
});
