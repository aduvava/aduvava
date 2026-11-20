export const privacyRequestOptions = [
  { value: "ACCESS", label: "Xem hoặc nhận thông tin dữ liệu của tôi" },
  { value: "CORRECTION", label: "Chỉnh sửa dữ liệu cá nhân" },
  { value: "DELETION", label: "Yêu cầu xóa dữ liệu cá nhân" },
  { value: "ACCOUNT_DELETION", label: "Yêu cầu xóa tài khoản" },
  { value: "RESTRICT", label: "Hạn chế hoặc phản đối xử lý" },
  { value: "WITHDRAW_CONSENT", label: "Rút lại sự đồng ý (nếu áp dụng)" },
  { value: "CHILD_SAFETY", label: "Yêu cầu bảo vệ dữ liệu trẻ em" },
] as const;
export const communityReportOptions = [
  { value: "PRIVACY", label: "Tiết lộ dữ liệu cá nhân" },
  { value: "BULLYING", label: "Bắt nạt, quấy rối hoặc đe dọa" },
  { value: "CHILD_SAFETY", label: "Nội dung gây nguy hiểm cho trẻ em" },
  { value: "COPYRIGHT", label: "Vi phạm bản quyền" },
  { value: "SPAM", label: "Lừa đảo, quảng cáo rác hoặc đường dẫn nguy hiểm" },
  { value: "OTHER", label: "Nội dung vi phạm khác" },
] as const;

export type PrivacyRequestType = typeof privacyRequestOptions[number]["value"];
export type CommunityReportType = typeof communityReportOptions[number]["value"];

export function optionLabel<T extends { value: string; label: string }>(
  options: readonly T[], value: string,
) {
  return options.find((option) => option.value === value)?.label ?? null;
}

// Display the name supplied in the user's Educhi profile in community and rankings.
// A missing name falls back to a generic label. Account IDs never become public aliases.
export function displayCommunityMember(user: { name?: string | null } | null) {
  return user?.name?.trim() || "Thành viên Educhi";
}

export function initialsOfDisplayName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0] || "").join("").toUpperCase() || "ED";
}
