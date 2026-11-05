import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDashboardSubjects, secondarySubjectCount } from "../src/lib/dashboard-subjects";

describe("THCS subject selection", () => {
  const subjects = [
    { name: "Công nghệ Công nghiệp", slug: "cong-nghe-cong-nghiep" },
    { name: "Công Nghệ", slug: "cong-nghe" },
    { name: "Công nghệ Nông nghiệp", slug: "cong-nghe-nong-nghiep" },
    { name: "Hóa Học", slug: "hoa-hoc" },
    { name: "Lịch Sử", slug: "lich-su" },
    { name: "Địa Lý", slug: "dia-ly" },
    { name: "Ngữ Văn", slug: "ngu-van" },
    { name: "Sinh Học", slug: "sinh-hoc" },
    { name: "Tin Học", slug: "tin-hoc" },
    { name: "Tiếng Anh", slug: "tieng-anh" },
    { name: "Toán", slug: "toan" },
    { name: "Vật Lý", slug: "vat-ly" },
    { name: "KT&PL", slug: "kt-va-phap-luat" },
    { name: "Giáo dục công dân", slug: "gdcd" },
  ];

  it("shows exactly eleven permitted subjects and prefers matching THCS records", () => {
    const shown = getDashboardSubjects(subjects, "secondary");
    assert.equal(secondarySubjectCount, 11);
    assert.equal(shown.length, 11);
    assert.deepEqual(shown.map(({ name }) => name), [
      "Công nghệ", "Hóa học", "Lịch sử", "Địa lý", "Ngữ văn",
      "Sinh học", "Tin học", "Tiếng Anh", "Toán", "Vật lý", "Giáo dục công dân",
    ]);
    assert.equal(shown[0].slug, "cong-nghe");
    assert.equal(shown[10].slug, "gdcd");
  });

  it("reuses a legacy KT&PL link when GDCD is not yet a separate database subject", () => {
    const shown = getDashboardSubjects(subjects.filter((item) => item.slug !== "gdcd"), "secondary");
    assert.equal(shown.at(-1)?.name, "Giáo dục công dân");
    assert.equal(shown.at(-1)?.slug, "kt-va-phap-luat");
  });

  it("does not invent broken links for subjects absent from the database", () => {
    const shown = getDashboardSubjects([{ name: "Toán", slug: "toan" }], "secondary");
    assert.deepEqual(shown, [{ name: "Toán", slug: "toan" }]);
  });

  it("does not change the available subjects for other education levels", () => {
    assert.deepEqual(getDashboardSubjects(subjects, "high-school"), subjects);
  });
});
