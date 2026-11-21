"use strict";

const nationalTemplates = require("../src/data/national-exam-templates.json");
const assessmentTemplates = require("../src/data/special-exam-templates.json");

const officialTypes = new Set(["SINGLE_CHOICE", "TRUE_FALSE_SET", "SHORT_ANSWER", "ESSAY"]);
function getOfficialSpec(educationLevel, subjectSlug) {
  if (educationLevel !== "THPTQG") return null;
  const spec = nationalTemplates[subjectSlug];
  if (!spec) throw new Error("Môn học này chưa có cấu trúc THPTQG chính thức.");
  return { ...spec, subjectSlug };
}

function getAssessmentSpec(track, variantId) {
  if (!track) return null;
  const template = assessmentTemplates[track];
  if (!template) throw new Error("Kỳ thi ĐGNL không hợp lệ.");
  const variant = template.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error("Hãy chọn tổ hợp/mã bài thi ĐGNL hợp lệ.");
  const blocks = [];
  let position = 1;
  for (const section of variant.parts) {
    for (const block of section.blocks) {
      blocks.push({ ...block, sectionKey: section.key, sectionLabel: section.label, start: position, end: position + block.count - 1 });
      position += block.count;
    }
  }
  return {
    specialExamTrack: track, variantId: variant.id, variantLabel: variant.label,
    scoreMode: template.scoreMode, durationMinutes: template.durationMinutes,
    maxPoints: template.maxPoints, parts: variant.parts, blocks, questionCount: position - 1,
  };
}

function parseAdminExamQuestions(raw, { educationLevel, subjectSlug, durationMinutes, specialExamTrack, specialExamVariant }, normalizeSingle, parseSimple) {
  const assessment = getAssessmentSpec(specialExamTrack, specialExamVariant);
  const rule = assessment ? null : getOfficialSpec(educationLevel, subjectSlug);
  if (assessment && durationMinutes !== assessment.durationMinutes) {
    throw new Error("Kỳ thi " + specialExamTrack + " cần đúng " + assessment.durationMinutes + " phút.");
  }
  if (rule && durationMinutes !== rule.durationMinutes) {
    throw new Error(`Đề THPTQG môn này phải có thời gian ${rule.durationMinutes} phút.`);
  }

  const content = String(raw || "").trim();
  if (!content) throw new Error("Vui lòng nhập nội dung đề.");
  const isJson = content.startsWith("{") || content.startsWith("[");
  let records;
  if (isJson) {
    const parsed = JSON.parse(content);
    records = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(records)) throw new Error("JSON cần có mảng questions.");
  } else {
    records = parseSimple(content);
  }
  if (!records.length) throw new Error("Đề thi cần ít nhất một câu hỏi.");
  if (assessment && records.length !== assessment.questionCount) {
    throw new Error("Đề " + specialExamTrack + " (" + assessment.variantLabel + ") cần đúng " + assessment.questionCount + " câu, hiện có " + records.length + " câu.");
  }
  if (rule) {
    const count = rule.parts.reduce((sum, part) => sum + part.count, 0);
    if (records.length !== count) throw new Error(`Đề THPTQG môn này cần đúng ${count} câu.`);
    if (!isJson && rule.parts.some((part) => part.count > 0 && part.questionType !== "SINGLE_CHOICE")) {
      throw new Error("Đề THPTQG môn này gồm nhiều dạng câu. Hãy dùng mẫu JSON THPTQG để nhập Đúng/Sai, Trả lời ngắn hoặc Tự luận.");
    }
  }

  let partIndex = 0;
  let remaining = rule?.parts[0]?.count ?? 0;
  const questions = records.map((input, index) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error(`Câu ${index + 1} không hợp lệ.`);
    if (rule) {
      while (partIndex < rule.parts.length && remaining === 0) {
        partIndex++;
        remaining = rule.parts[partIndex]?.count ?? 0;
      }
      remaining--;
    }
    const part = rule?.parts[partIndex];
    const assessmentBlock = assessment?.blocks.find((block) => index + 1 >= block.start && index + 1 <= block.end);
    const type = input.type || assessmentBlock?.questionType || part?.questionType || "SINGLE_CHOICE";
    if (!officialTypes.has(type)) throw new Error(`Câu ${index + 1} có loại câu không hợp lệ.`);
    if (assessmentBlock && !(assessmentBlock.allowedTypes || [assessmentBlock.questionType]).includes(type)) {
      throw new Error("Câu " + (index + 1) + " (" + assessmentBlock.label + ") phải là " + (assessmentBlock.allowedTypes || [assessmentBlock.questionType]).join(" hoặc ") + ".");
    }
    if (input.blockKey && assessmentBlock && input.blockKey !== assessmentBlock.key) {
      throw new Error("Câu " + (index + 1) + " đang gắn sai phần thi: " + input.blockKey + " (phải là " + assessmentBlock.key + ").");
    }
    if (part && type !== part.questionType) {
      throw new Error(`Câu ${index + 1} phải thuộc dạng ${part.questionType} theo cấu trúc THPTQG.`);
    }

    const parsedPoints = Number(input.points ?? 1);
    const points = assessmentBlock ? assessmentBlock.pointsPerQuestion : part ? part.pointsPerQuestion : (Number.isFinite(parsedPoints) && parsedPoints > 0 ? parsedPoints : 1);
    let prompt;
    let answerOptions = [];
    let correctText = null;
    let correct = "";
    let explanation = String(input.explanation || "").trim();

    if (type === "SINGLE_CHOICE") {
      const item = isJson ? normalizeSingle(input, index + 1) : input;
      prompt = item.prompt;
      explanation = item.explanation || "";
      answerOptions = item.answers.map((answer) => ({
        label: answer.label,
        content: answer.content,
        isCorrect: answer.label === item.correct,
      }));
      correct = item.correct;
      if (assessment && answerOptions.length !== 4) {
        throw new Error("Câu " + (index + 1) + " thuộc kỳ thi ĐGNL cần đúng 4 phương án.");
      }
    } else {
      prompt = String(input.prompt ?? input.question ?? "").trim();
      if (!prompt) throw new Error(`Câu ${index + 1} chưa có nội dung.`);
      if (type === "TRUE_FALSE_SET") {
        const statements = input.statements ?? input.options;
        if (!Array.isArray(statements) || statements.length !== 4) {
          throw new Error(`Câu ${index + 1} Đúng/Sai cần đúng 4 mệnh đề.`);
        }
        answerOptions = statements.map((item, optionIndex) => {
          if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.isCorrect !== "boolean") {
            throw new Error(`Câu ${index + 1}, mệnh đề ${optionIndex + 1} cần content và isCorrect (true/false).`);
          }
          const content = String(item.content ?? item.text ?? "").trim();
          if (!content) throw new Error(`Câu ${index + 1} có mệnh đề trống.`);
          return { label: String.fromCharCode(65 + optionIndex), content, isCorrect: item.isCorrect };
        });
        correct = "Đúng/Sai theo từng mệnh đề";
      } else if (type === "SHORT_ANSWER") {
        correctText = String(input.correctText ?? input.correct ?? input.answer ?? "").trim();
        if (!correctText) throw new Error(`Câu ${index + 1} trả lời ngắn cần correctText.`);
        correct = correctText;
      } else {
        correct = "Tự luận, chấm thủ công";
      }
    }
    return {
      position: index + 1,
      type,
      prompt,
      points,
      correctText,
      explanation: explanation || null,
      answerOptions,
      preview: {
        prompt,
        answers: answerOptions.map(({ label, content }) => ({ label, content })),
        correct,
        explanation,
        type,
        section: assessmentBlock?.sectionLabel || part?.label || null,
        points,
      },
    };
  });

  if (assessment) {
    const total = questions.reduce((sum, question) => sum + question.points, 0);
    const expected = assessment.scoreMode === "IRT" ? assessment.questionCount : assessment.maxPoints;
    if (Math.abs(total - expected) > 0.001) {
      throw new Error("Tổng trọng số câu hỏi không khớp cấu trúc ĐGNL.");
    }
  }
  return {
    rule: assessment || rule,
    questions: questions.map(({ preview, ...question }) => question),
    preview: questions.map(({ preview }) => preview),
  };
}

module.exports = { getOfficialSpec, getAssessmentSpec, parseAdminExamQuestions };
