import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getItemVisual } from "../src/lib/subject-visuals";

describe("shared subject illustrations", () => {
  const cases = [
    ["Toán", "toan", "/subject-images/toan.png"],
    ["Ngữ văn", "ngu-van", "/subject-images/ngu-van.png"],
    ["Tiếng Anh", "tieng-anh", "/subject-images/tieng-anh.png"],
    ["Lịch sử", "lich-su", "/subject-images/lich-su.png"],
    ["Địa lý", "dia-ly", "/subject-images/dia-ly.png"],
    ["Sinh học", "sinh-hoc", "/subject-images/sinh-hoc.png"],
    ["Vật lý", "vat-ly", "/subject-images/vat-ly.png"],
    ["Hóa học", "hoa-hoc", "/subject-images/hoa-hoc.png"],
    ["Giáo dục công dân", "gdcd", "/subject-images/kt-va-phap-luat.png"],
    ["KT&PL", "kt-va-phap-luat", "/subject-images/kt-va-phap-luat.png"],
    ["Tin học", "tin-hoc", "/subject-images/tin-hoc.webp"],
    ["Công nghệ", "cong-nghe", "/subject-images/cong-nghe-nong-nghiep.png"],
    ["Công nghệ Nông nghiệp", "cong-nghe-nong-nghiep", "/subject-images/cong-nghe-nong-nghiep.png"],
    ["Công nghệ Công nghiệp", "cong-nghe-cong-nghiep", "/subject-images/cong-nghe-cong-nghiep.webp"],
  ] as const;

  for (const [name, slug, imageSrc] of cases) {
    it(`uses the dashboard illustration for ${name}`, () => {
      assert.equal(getItemVisual(name, slug).imageSrc, imageSrc);
    });
  }

  it("falls back to an icon for a subject without an illustration", () => {
    const fallback = getItemVisual("Môn mới", "mon-moi");
    assert.equal(fallback.imageSrc, undefined);
    assert.ok(fallback.icon);
  });
});
