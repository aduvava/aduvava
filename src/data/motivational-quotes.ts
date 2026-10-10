export const motivationalQuotes = [
  "Mỗi ngày tiến một chút, bạn sẽ đi xa hơn mình tưởng.",
  "Kỷ luật hôm nay là sự tự tin của ngày mai.",
  "Không cần học thật lâu, chỉ cần tập trung thật sâu.",
  "Một bài tập hoàn thành tốt hơn mười kế hoạch còn dang dở.",
  "Kiến thức lớn lên từ những lần bạn không ngại hỏi.",
];

export function getDailyQuote(date = new Date()) {
  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 0)) /
      86_400_000,
  );

  return motivationalQuotes[dayOfYear % motivationalQuotes.length];
}
