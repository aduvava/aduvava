export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export function formatScore(score: number, maxScore: number) {
  if (!maxScore) return "0%";
  return `${Math.round((score / maxScore) * 100)}%`;
}
