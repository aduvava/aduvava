import assert from "node:assert/strict";
import test from "node:test";
import { getDefaultDashboardClass } from "../src/lib/default-dashboard-class";

for (const grade of ["6", "7", "8", "9", "10", "11", "12"]) {
  test(`home defaults to the account's saved grade ${grade}`, () => {
    assert.deepEqual(getDefaultDashboardClass(grade), {
      groupId: Number(grade) <= 9 ? "secondary" : "high-school",
      className: `Lớp ${grade}`,
    });
  });
}

test("legacy homeroom value maps to its grade", () => {
  assert.deepEqual(getDefaultDashboardClass("Lớp 11A1"), {
    groupId: "high-school",
    className: "Lớp 11",
  });
});

test("missing grade keeps the legacy fallback for non-student roles", () => {
  assert.deepEqual(getDefaultDashboardClass(null), {
    groupId: "secondary",
    className: "Lớp 6",
  });
});
