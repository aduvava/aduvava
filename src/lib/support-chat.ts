/**
 * Local, transparent help for common Educhi workflows.
 * This does not contact a human agent or any external AI service.
 */
function normalizeSupportMessage(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim().toLowerCase();
}

export const supportQuickQuestions = ["Cách làm đề thi", "Thanh toán VIP", "Đổi ảnh đại diện"] as const;

export function getSupportReply(message: string): string {
  const text = normalizeSupportMessage(message);

  if (!text) return "Bạn hãy nhập câu hỏi để mình hỗ trợ nhé.";

  if (/^(hi|hello|hey|alo|chao|xin chao|chao ban|ad|admin)[!?.\s]*$/.test(text)) {
    return "Chào bạn! Mình là trợ lý hướng dẫn tự động của Educhi. Bạn cần giúp về đề thi, tài liệu, VIP, đăng nhập hay ảnh đại diện?";
  }
  if (/(dang nhap|mat khau|google|gmail|tai khoan)/.test(text)) {
    return "Bạn có thể đăng nhập qua Google hoặc tài khoản đã tạo. Nếu không đăng nhập được, hãy kiểm tra đúng tài khoản, tải lại trang và thử lần nữa. Không gửi mật khẩu hay mã xác minh trong khung chat.";
  }
  if (/(vip|thanh toan|chuyen khoan|ngan hang|ma qr|qu[eé]t ma|mua goi)/.test(text)) {
    return "Để nâng VIP, hãy mở phần gói thành viên và làm theo hướng dẫn thanh toán trên Educhi. Nếu đã chuyển khoản nhưng quyền VIP chưa cập nhật, hãy giữ lại biên lai để quản trị viên kiểm tra; chatbot này không xác minh giao dịch.";
  }
  if (/(avatar|anh dai dien|kho do|cua hang|vat pham|trang bi)/.test(text)) {
    return "Bạn vào Cửa hàng để xem vật phẩm, sau đó mở Kho đồ để chọn và trang bị ảnh đã sở hữu. Nếu ảnh chưa đổi, hãy tải lại trang để kiểm tra.";
  }
  if (/(de thi|luyen de|lam bai|nop bai|trac nghiem|cau hoi)/.test(text)) {
    return "Bạn mở mục Đề thi, chọn lớp và môn học phù hợp, sau đó chọn đề để bắt đầu. Khi hoàn thành, hãy nộp bài theo hướng dẫn trên trang làm bài.";
  }
  if (/(tai lieu|ly thuyet|bai hoc|pdf|word)/.test(text)) {
    return "Bạn mở mục Tài liệu, chọn lớp và môn học để xem các tài liệu lý thuyết đã được đăng.";
  }
  if (/(lop hoc|giao vien|hoc sinh)/.test(text)) {
    return "Bạn mở mục Lớp học trên thanh điều hướng để xem các chức năng của lớp. Nếu gặp thông báo lỗi, hãy ghi lại nội dung lỗi để quản trị viên kiểm tra.";
  }
  return "Mình hiện trả lời tự động các hướng dẫn cơ bản, chưa phải nhân viên trực tuyến. Bạn hãy hỏi cụ thể về đề thi, tài liệu, VIP, đăng nhập hoặc đổi ảnh đại diện nhé.";
}
