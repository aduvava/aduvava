"use strict";

const nationalTemplates = require("../src/data/national-exam-templates.json");

const officialTypes = new Set(["SINGLE_CHOICE", "TRUE_FALSE_SET", "SHORT_ANSWER", "ESSAY"]);
function getOfficialSpec(educationLevel, subjectSlug) {
  if (educationLevel !== "THPTQG") return null;
  const spec = nationalTemplates[subjectSlug];
  if (!spec) throw new Error("Môn học này chưa có cấu trúc THPTQG chính thức.");
  return { ...spec, subjectSlug };
}

function parseAdminExamQuestions(raw, { educationLevel, subjectSlug, durationMinutes }, normalizeSingle, parseSimple) {
  const rule = getOfficialSpec(educationLevel, subjectSlug);
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
    const type = input.type || part?.questionType || "SINGLE_CHOICE";
    if (!officialTypes.has(type)) throw new Error(`Câu ${index + 1} có loại câu không hợp lệ.`);
    if (part && type !== part.questionType) {
      throw new Error(`Câu ${index + 1} phải thuộc dạng ${part.questionType} theo cấu trúc THPTQG.`);
    }

    const parsedPoints = Number(input.points ?? 1);
    const points = part ? part.pointsPerQuestion : (Number.isFinite(parsedPoints) && parsedPoints > 0 ? parsedPoints : 1);
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
      },
    };
  });

  return {
    rule,
    questions: questions.map(({ preview, ...question }) => question),
    preview: questions.map(({ preview }) => preview),
  };
}

module.exports = { getOfficialSpec, parseAdminExamQuestions };
