# Nhóm học tập — Educhi

## Phiên bản đầu tiên
- Người dùng đã đăng nhập tạo nhóm và nhận mã mời ngẫu nhiên 10 ký tự.
- Bạn bè nhập mã để tham gia; mỗi tài khoản tối đa 20 nhóm, mỗi nhóm 100 thành viên.
- Thành viên có thể đóng góp đề cá nhân **do chính mình tạo** từ kho `/exams/my` vào nhóm. Không sao chép đề hay đáp án; chỉ tạo liên kết giữa nhóm và đề.
- Danh sách đề riêng của nhóm chỉ được tải ở trang `/nhom-hoc/[id]` sau khi xác thực tư cách thành viên. Bài làm và kết quả vẫn tách biệt theo tài khoản.
- Chủ đề/người góp đề được quyền gỡ; chủ nhóm có thể gỡ mọi đề. Rời nhóm hoặc xóa nhóm thu hồi quyền truy cập **qua nhóm**, không xóa đề gốc và không xóa kết quả của từng người.
- Khóa truy cập VIP tiếp tục áp dụng trên `canAccessExam`. Không cho phép đưa đề thi quản trị/hệ thống vào kho nhóm qua API.
- Không thay đổi `shareMode` của đề khi đưa vào nhóm. Đề PUBLIC vốn đã xem được bằng link; nếu cần giữ riêng tư, chọn RESTRICTED khi tạo đề.
- Thành viên nên chỉ chia sẻ mã mời trong phạm vi cần thiết. Mã mời chưa hỗ trợ xoay mã hay duyệt yêu cầu vào nhóm.

## Triển khai
1. Kiểm tra và chạy migration bằng `npx prisma migrate deploy` trên môi trường có `DATABASE_URL` hợp lệ (nên sao lưu trước).
2. Build bằng `npm run build` để chạy `prisma generate`; chạy `npm test`.
3. Cập nhật ứng dụng thông qua quy trình deploy vốn có của Educhi.
4. Thử nghiệm với hai tài khoản: A tạo nhóm + đề RESTRICTED, B không mở được khi chưa vào, sau khi nhập mã mở được và làm bài, B rời nhóm thì không thể bắt đầu bài mới.
5. Thử các trường hợp gỡ đề, xóa nhóm, và xác nhận đề cá nhân không lọt vào API danh mục đề công khai.

## Hướng phát triển
Chấm bài theo đợt, bảng điểm nhóm có quyền riêng tư, thông báo có đề mới, yêu cầu tham gia cần duyệt, quản lý thành viên, đổi mã mời, lịch học nhóm.
