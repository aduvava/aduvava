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
    await verifyExamSchema({
      $queryRaw: async () => [{ column_name: "grade" }, { column_name: "contentMode" }],
      exam: { findFirst: async ({ select }: { select: Record<string, boolean> }) => {
        assert.equal(select.contentMode, true);
        queried = true;
        return null;
      } },
    });
    assert.equal(queried, true);
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
