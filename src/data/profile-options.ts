export const SCHOOL_GRADES = ["6", "7", "8", "9", "10", "11", "12"];

export const VIETNAM_PROVINCES = [
  "Tuyên Quang",
  "Lào Cai",
  "Thái Nguyên",
  "Phú Thọ",
  "Bắc Ninh",
  "Hưng Yên",
  "Hải Phòng",
  "Ninh Bình",
  "Quảng Trị",
  "Đà Nẵng",
  "Quảng Ngãi",
  "Gia Lai",
  "Khánh Hòa",
  "Lâm Đồng",
  "Đắk Lắk",
  "Hồ Chí Minh",
  "Đồng Nai",
  "Tây Ninh",
  "Cần Thơ",
  "Vĩnh Long",
  "Đồng Tháp",
  "Cà Mau",
  "An Giang",
  "Hà Nội",
  "Huế",
  "Lai Châu",
  "Điện Biên",
  "Sơn La",
  "Lạng Sơn",
  "Quảng Ninh",
  "Thanh Hóa",
  "Nghệ An",
  "Hà Tĩnh",
  "Cao Bằng",
] as const;

export function normalizeSchoolGrade(value?: string | null) {
  const grade = value?.match(/\d{1,2}/)?.[0];
  return grade && SCHOOL_GRADES.includes(grade) ? grade : "";
}

export function normalizeProvince(value?: string | null) {
  const name = value?.trim().replace(/^(tỉnh|thành phố|tp\.?)\s*/i, "").trim();
  if (!name) return "";

  return VIETNAM_PROVINCES.find((province) => province.toLocaleLowerCase("vi-VN") === name.toLocaleLowerCase("vi-VN")) ?? "";
}
