# Cập nhật chương, phân loại đề và thanh toán QR

Bản cập nhật giữ dữ liệu hiện có, bổ sung `Exam.contentMode`, `Exam.chapterId` và bảng chống xử lý trùng giao dịch `BankWebhookEvent`. Các đề cũ lấy loại từ metadata, hoặc `PRACTICE` → chuyên đề; các loại khác → kì thi. Admin có thể sửa phân loại và chọn chương ngay ở danh sách đề.

## Cập nhật VPS đang dùng Docker Compose

Chạy trong phiên SSH của VPS. Thư mục ứng dụng hiện tại là `/opt/eduva`.

```bash
(
set -e
cd /opt/eduva
TASK_BACKUP_DIR="/root/eduva-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TASK_BACKUP_DIR"
chmod 700 "$TASK_BACKUP_DIR"
cp .env "$TASK_BACKUP_DIR/env.backup"
docker compose exec -T db pg_dump -U postgres -d eduva > "$TASK_BACKUP_DIR/database.sql"
test -s "$TASK_BACKUP_DIR/database.sql"
git pull --ff-only origin fix/admin-content-vip-checkout
docker compose build web admin
docker compose run --rm --no-deps web npx prisma migrate deploy
docker compose run --rm --no-deps web node scripts/ensure-subjects.js
docker compose up -d --no-build web admin
docker compose ps
)
```

Không chạy seed toàn bộ database. Nếu Git báo thay đổi cục bộ hoặc khác nhánh, dừng để kiểm tra `git status` trước khi tiếp tục; không reset hay xóa dữ liệu.

## Thanh toán QR

Ba biến ngân hàng đã dùng trước đây vẫn được sử dụng:

```dotenv
PAYMENT_BANK_NAME="BIDV"
PAYMENT_BANK_ACCOUNT_NUMBER="SO_TAI_KHOAN_CUA_BAN"
PAYMENT_BANK_ACCOUNT_HOLDER="TEN_CHU_TAI_KHOAN"
```

Chọn gói VIP sẽ mở QR chứa tài khoản, số tiền và mã đơn. Đơn đang chờ có thể mở lại; trang kiểm tra trạng thái mỗi 5 giây. QR được tạo qua `https://vietqr.app/img` theo tài liệu SePay. Nếu ảnh không tải được, thông tin chuyển khoản vẫn hiện để nhập tay.

## Bật tự xác nhận tiền vào qua SePay

QR tự nó không báo đã nhận tiền. Cần kết nối đúng tài khoản nhận tiền với SePay và cấu hình webhook trên tài khoản SePay của chủ website.

1. Kết nối tài khoản ngân hàng nhận tiền trong SePay và kiểm tra dịch vụ đã nhận được giao dịch của tài khoản đó.
2. Trên VPS, tạo khóa riêng bằng `openssl rand -hex 32`. Lưu cùng một giá trị vào `.env` và mục API Key của webhook SePay:

   ```dotenv
   SEPAY_WEBHOOK_API_KEY="KHOA_NGAU_NHIEN_VUA_TAO"
   SEPAY_BANK_GATEWAY="BIDV"
   ```

   `SEPAY_BANK_GATEWAY` phải trùng trường `gateway` SePay gửi. Nếu để trống, ứng dụng dùng `PAYMENT_BANK_NAME`.
3. Tạo webhook SePay:
   - Sự kiện: **Có tiền vào**.
   - Tài khoản: đúng tài khoản nhận tiền của website.
   - URL: `https://educhi.xyz/api/payments/sepay`.
   - Xác thực: **API Key**; nhập cùng khóa vừa lưu. SePay gửi header `Authorization: Apikey <khóa>`.
   - Để bộ lọc mã thanh toán trống lúc kiểm tra kết nối. Website tự khớp mã `EDUVA` trong nội dung; không phụ thuộc cấu hình trích xuất mã của SePay.
4. Nạp lại cấu hình: `cd /opt/eduva && docker compose up -d --no-build web admin`.
5. Tạo một đơn VIP và chuyển đúng số tiền/nội dung từ QR. Xem nhật ký webhook SePay, trạng thái đơn phải chuyển **PAID** và VIP có hiệu lực. Gửi lại cùng webhook không được cộng thêm thời hạn.

Sai tài khoản, ngân hàng, số tiền hoặc mã đơn sẽ không tự kích hoạt. Đơn đã đánh dấu FAILED cần admin đối soát. Nếu chưa có khóa webhook, giao diện tiếp tục báo chờ quản trị viên xác nhận; QR vẫn hoạt động. Đã nhập khóa nhưng chưa kết nối ngân hàng/webhook thì vẫn chưa thể tự xác nhận.

Tài liệu giao thức: https://docs.sepay.vn/tich-hop-webhooks.html và https://developer.sepay.vn/vi/tien-ich-khac/tao-qr-code.

## Kiểm tra giao diện

- `/admin/exams`: chọn lớp, môn, loại Theo chuyên đề/Theo kì thi, chương, file và thời gian. Xuất bản rồi kiểm tra đúng tab ở trang môn học. Đề đã có có nút sửa phân loại/chương.
- `/admin/subjects`: chọn lớp/môn rồi bấm **Nhập chương**. `/admin/theory-chapters` dùng chung chương để tải tài liệu.
- Menu không còn Câu hỏi, Bài lý thuyết và Blog. Hai trang quản lý cũ chuyển về form tương ứng; trang Blog công khai trả 404, dữ liệu cũ không bị xóa.
- Admin độc lập ở `admin.educhi.xyz` cũng có mục Môn học & chương và chọn chương khi nhập đề/lý thuyết.
- Google: người mới hoàn tất hồ sơ sau đăng nhập, hồ sơ hoàn tất được bỏ qua ở các lần sau. Nút đăng nhập cho chọn tài khoản Google và tách phiên cũ trước khi chuyển tài khoản. Gmail/Workspace được Google xác minh có thể nối tài khoản Eduva cùng email tự động. Với hộp thư ngoài Google trùng tài khoản cũ, vẫn cần mật khẩu cũ một lần vì Google không xác nhận quyền sở hữu hiện tại của hộp thư ngoài hệ thống.

## Kiểm thử bản mã

`npm test`, `npx tsc --noEmit`, `node --check admin-server/server.js`, `npm run build`.
Kết nối Google thật, giao dịch ngân hàng thật và migration trên PostgreSQL VPS phải được kiểm tra sau khi triển khai; không sử dụng dữ liệu hoặc khóa thật trong kiểm thử cục bộ.
