import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { missingExamColumns, verifyExamSchema } = require("../scripts/verify-exam-schema.js");

describe("Prisma exam-schema deployment gate", () => {
  it("detects pending grade and contentMode migrations", async () => {
    assert.deepEqual(await missingExamColumns({
      $queryRaw: async () => [{ column_name: "grade" }],
    }), ["contentMode"]);
    assert.deepEqual(await missingExamColumns({
      $queryRaw: async () => [],
    }), ["grade", "contentMode"]);
  });

  it("accepts a migrated Exam schema with the generated client", async () => {
    let queried = false;
    let rawCalls = 0;
    await verifyExamSchema({
      $queryRaw: async () => ++rawCalls === 1
        ? [{ column_name: "grade" }, { column_name: "contentMode" }]
        : [{ udt_name: "ExamContentMode" }],
      exam: { findFirst: async ({ select }: { select: Record<string, boolean> }) => {
        assert.equal(select.contentMode, true);
        queried = true;
        return null;
      } },
    });
    assert.equal(queried, true);
  });

  it("detects incompatible legacy TEXT category columns even with no exams", async () => {
    let rawCalls = 0;
    await assert.rejects(() => verifyExamSchema({
      $queryRaw: async () => ++rawCalls === 1
        ? [{ column_name: "grade" }, { column_name: "contentMode" }]
        : [{ udt_name: "text" }],
      exam: { findFirst: async () => null },
    }), /must use PostgreSQL enum/);
  });

  it("stops deployment before querying a missing column", async () => {
    let queried = false;
    await assert.rejects(
      () => verifyExamSchema({
        $queryRaw: async () => [{ column_name: "grade" }],
        exam: { findFirst: async () => { queried = true; } },
      }),
      /contentMode/,
    );
    assert.equal(queried, false);
  });
});
