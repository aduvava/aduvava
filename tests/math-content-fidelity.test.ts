import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { latexErrors, withExplicitLatex, hasCorruptedPdfMath } from "../src/lib/math-latex";
import { RichContent } from "../src/components/rich-content";
import { validateOfficialSpecialExam } from "../src/lib/official-special-exam-publication";
import { getAssessmentVariant, flattenAssessmentBlocks } from "../src/lib/special-exam-rules";

describe("math content fidelity", () => {
  it("renders fractions, exponents and limits with all four LaTeX delimiters", () => {
    const input = "$\\frac{T(x)}{x}$ and \\(x^2\\), $$\\lim_{x\\to+\\infty}M(x)=5$$ and \\[\\sqrt{3}\\]";
    assert.deepEqual(latexErrors(input), []);
    const html = renderToStaticMarkup(createElement(RichContent, { value: input }));
    assert.equal((html.match(/class="katex"/g) ?? []).length, 4);
  });

  it("rejects invalid latex and detects damaged source glyphs", () => {
    assert.ok(latexErrors("$\\frac{T(x)}$").length > 0);
    assert.equal(hasCorruptedPdfMath("y = \uF0A2(x)"), true);
    assert.equal(hasCorruptedPdfMath("$f'(x)=2x$"), false);
    assert.equal(withExplicitLatex("Công thức", "\\frac{1}{x}"),
      "Công thức\n\n$$\\frac{1}{x}$$");
  });

  it("blocks invalid LaTeX in HSA at publication", () => {
    const variant = getAssessmentVariant("HSA", "EN")!;
    const blocks = flattenAssessmentBlocks(variant);
    const questions = Array.from({ length: 150 }, (_, index) => {
      const position = index + 1;
      const block = blocks.find((item) => position >= item.start && position <= item.end)!;
      const short = position <= 15;
      return {
        position,
        type: short ? "SHORT_ANSWER" as const : "SINGLE_CHOICE" as const,
        points: block.pointsPerQuestion,
        prompt: position === 5 ? "Sai $\\frac{1}{$" : "Câu hỏi",
        correctText: short ? "2" : null,
        answerOptions: short ? [] : [true, false, false, false].map((isCorrect) => ({ isCorrect })),
      };
    });
    assert.throws(() => validateOfficialSpecialExam({
      track: "HSA", variantId: "EN", durationMinutes: 195, questions,
    }), /LaTeX sai/);
  });
});
