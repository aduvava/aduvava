/**
 * A skill map must not go blank merely because legacy questions have no Topic.
 * Never infer a textbook chapter from an exam title or a question's text:
 * subject, question type and exam results are factual fallbacks.
 */
export type LearningAttempt = {
  id: string;
  examId: string;
  examTitle: string;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  educationLevel: string | null;
  grade: string | null;
  specialExamTrack: string | null;
  score: number;
  maxScore: number;
};

export type LearningAnswer = {
  attemptId: string;
  questionId: string;
  type: string;
  score: number;
  points: number;
  topicId: string | null;
  topicName: string | null;
};

export type LearningGroup = {
  key: string;
  label: string;
  count: number;
  earned: number;
  maximum: number;
  percent: number;
  enough: boolean;
  href?: string;
};

type Totals = { key: string; label: string; count: number; earned: number; maximum: number; href?: string };

const specialLabels: Record<string, string> = {
  HSA: "HSA",
  TSA: "TSA",
  V_ACT: "V-ACT",
  QDA: "QDA",
  DGNL_BCA: "ĐGNL BCA",
};

export const questionTypeLabels: Record<string, string> = {
  SINGLE_CHOICE: "Trắc nghiệm nhiều lựa chọn",
  TRUE_FALSE_SET: "Trắc nghiệm Đúng / Sai",
  SHORT_ANSWER: "Trả lời ngắn",
};

function normalizedGrade(grade: string | null | undefined): string | null {
  const match = String(grade ?? "").match(/^(?:lớp\s*)?(6|7|8|9|10|11|12)$/i);
  return match?.[1] ?? null;
}

export function scopeOfAttempt(attempt: Pick<LearningAttempt, "specialExamTrack" | "educationLevel" | "grade">) {
  if (attempt.specialExamTrack) {
    return { key: "track:" + attempt.specialExamTrack, label: specialLabels[attempt.specialExamTrack] ?? attempt.specialExamTrack };
  }
  if (attempt.educationLevel === "EXAM_10") return { key: "exam10", label: "Ôn thi vào 10" };
  if (attempt.educationLevel === "THPTQG") return { key: "thptqg", label: "Ôn thi THPTQG" };
  const grade = normalizedGrade(attempt.grade);
  if (grade) return { key: "grade:" + grade, label: "Lớp " + grade };
  if (attempt.educationLevel === "THCS") return { key: "thcs", label: "THCS (chưa rõ lớp)" };
  if (attempt.educationLevel === "THPT") return { key: "thpt", label: "THPT (chưa rõ lớp)" };
  return { key: "other", label: "Đề khác" };
}

function groupMetrics(items: Totals[], minimum: number): LearningGroup[] {
  return items.map((item) => ({
    ...item,
    percent: item.maximum > 0
      ? Math.max(0, Math.min(100, Math.round(item.earned / item.maximum * 100)))
      : 0,
    enough: item.count >= minimum && item.maximum > 0,
  }));
}

export function buildLearningMap(
  attempts: LearningAttempt[],
  answers: LearningAnswer[],
  requestedScope?: string,
  profileGrade?: string | null,
) {
  const scopes = new Map<string, { key: string; label: string; count: number }>();
  for (const attempt of attempts) {
    const scope = scopeOfAttempt(attempt);
    const previous = scopes.get(scope.key);
    scopes.set(scope.key, { ...scope, count: (previous?.count ?? 0) + 1 });
  }

  const scopeList = Array.from(scopes.values());
  const profileScope = normalizedGrade(profileGrade) ? "grade:" + normalizedGrade(profileGrade) : "";
  const selectedScope = requestedScope && scopes.has(requestedScope)
    ? requestedScope
    : profileScope && scopes.has(profileScope) ? profileScope : scopeList[0]?.key ?? "";

  const selectedAttempts = attempts.filter((attempt) => scopeOfAttempt(attempt).key === selectedScope);
  const activeIds = new Set(selectedAttempts.map((attempt) => attempt.id));
  const selectedAnswers = answers.filter((answer) => activeIds.has(answer.attemptId));
  const attemptById = new Map(selectedAttempts.map((attempt) => [attempt.id, attempt]));

  const subjects = new Map<string, Totals>();
  const exams = new Map<string, Totals>();
  for (const attempt of selectedAttempts) {
    if (attempt.maxScore <= 0) continue;
    // Normalize every attempt to 100 points before averaging different exams.
    const percent = Math.max(0, Math.min(1, attempt.score / attempt.maxScore)) * 100;
    const subject = subjects.get(attempt.subjectId) ?? {
      key: attempt.subjectId, label: attempt.subjectName,
      count: 0, earned: 0, maximum: 0, href: "/subjects/" + attempt.subjectSlug,
    };
    subject.count += 1;
    subject.earned += percent;
    subject.maximum += 100;
    subjects.set(attempt.subjectId, subject);

    const exam = exams.get(attempt.examId) ?? {
      key: attempt.examId, label: attempt.examTitle, count: 0,
      earned: 0, maximum: 0, href: "/exams/" + attempt.examId,
    };
    exam.count += 1;
    exam.earned += percent;
    exam.maximum += 100;
    exams.set(attempt.examId, exam);
  }

  const topics = new Map<string, Totals>();
  const types = new Map<string, Totals>();
  let untaggedCount = 0;
  let gradedCount = 0;
  for (const answer of selectedAnswers) {
    const attempt = attemptById.get(answer.attemptId);
    if (!attempt || answer.points <= 0) continue;
    gradedCount += 1;
    const typeLabel = questionTypeLabels[answer.type];
    if (typeLabel) {
      const key = answer.type;
      const type = types.get(key) ?? { key, label: typeLabel, count: 0, earned: 0, maximum: 0 };
      type.count += 1;
      type.earned += answer.score;
      type.maximum += answer.points;
      types.set(key, type);
    }
    if (answer.topicId && answer.topicName) {
      const key = attempt.subjectId + ":" + answer.topicId;
      const topic = topics.get(key) ?? {
        key, label: answer.topicName, count: 0, earned: 0, maximum: 0,
        href: "/subjects/" + attempt.subjectSlug,
      };
      topic.count += 1;
      topic.earned += answer.score;
      topic.maximum += answer.points;
      topics.set(key, topic);
    } else {
      untaggedCount += 1;
    }
  }

  const byPercent = (a: LearningGroup, b: LearningGroup) => a.percent - b.percent || b.count - a.count;
  const subjectGroups = groupMetrics(Array.from(subjects.values()), 2).sort((a, b) => b.count - a.count || byPercent(a, b));
  const topicGroups = groupMetrics(Array.from(topics.values()), 5).sort(byPercent);
  const typeGroups = groupMetrics(Array.from(types.values()), 5).sort(byPercent);
  const examGroups = groupMetrics(Array.from(exams.values()), 2).sort((a, b) => b.count - a.count || byPercent(a, b));

  const weakTopic = topicGroups.find((topic) => topic.enough && topic.percent < 65);
  const weakSubject = subjectGroups.filter((subject) => subject.enough).sort(byPercent).find((subject) => subject.percent < 70);
  const weakType = typeGroups.find((type) => type.enough && type.percent < 70);

  const recommendation = weakTopic
    ? { title: "Ôn lại chuyên đề " + weakTopic.label, detail: "Chuyên đề này đang có tỷ lệ điểm " + weakTopic.percent + "%. Ưu tiên chữa câu sai rồi luyện thêm.", href: "/so-loi-sai" }
    : weakSubject
      ? { title: "Ưu tiên môn " + weakSubject.label, detail: "Điểm trung bình " + weakSubject.percent + "% trong " + weakSubject.count + " lượt làm. Nên luyện phần cơ bản trước.", href: weakSubject.href ?? "/exams" }
      : weakType
        ? { title: "Luyện dạng " + weakType.label, detail: "Dạng câu này đang đạt " + weakType.percent + "%. Hãy ôn lại cách làm và kiểm tra lỗi sai.", href: "/so-loi-sai" }
        : selectedAttempts.length === 0
          ? { title: "Bắt đầu với một đề luyện", detail: "Hoàn thành đề đầu tiên để Educhi thống kê kết quả học tập của bạn.", href: "/exams" }
          : { title: "Tiếp tục duy trì tiến độ", detail: "Bạn đã có kết quả học tập. Hãy làm thêm đề để số liệu theo từng dạng câu và chuyên đề đáng tin cậy hơn.", href: "/exams" };

  return {
    scopes: scopeList,
    selectedScope,
    submittedCount: selectedAttempts.length,
    gradedCount,
    untaggedCount,
    subjects: subjectGroups,
    topics: topicGroups,
    types: typeGroups,
    exams: examGroups,
    recommendation,
  };
}
