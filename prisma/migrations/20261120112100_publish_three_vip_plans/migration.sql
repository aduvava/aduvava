-- Existing payment and subscription rows retain their historical plan IDs,
-- prices and durations. Retire plans without deleting or modifying them.
UPDATE "Plan" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "isActive" = true;

-- Create new purchasable plans with new IDs; old pending invoices can still
-- be settled according to the old plan's unchanged terms.
INSERT INTO "Plan" ("id", "slug", "name", "description", "price", "interval", "features", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'educhi-vip-1m', 'Gói 1 tháng', '39.000đ/tháng',
   39000, 'MONTH'::"PlanInterval",
   '["Mở khóa đề thi VIP đã xuất bản","Truy cập lý thuyết và học liệu VIP nâng cao","Thanh toán một lần, không tự động gia hạn"]'::jsonb,
   true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'educhi-vip-3m', 'Gói 3 tháng', '33.000đ/tháng, tiết kiệm 18.000đ so với mua lẻ',
   99000, 'QUARTER'::"PlanInterval",
   '["Mở khóa đề thi VIP đã xuất bản","Truy cập lý thuyết và học liệu VIP nâng cao","Thanh toán một lần, không tự động gia hạn"]'::jsonb,
   true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'educhi-vip-6m', 'Gói 6 tháng', '31.500đ/tháng, tiết kiệm 45.000đ so với mua lẻ',
   189000, 'HALF_YEAR'::"PlanInterval",
   '["Mở khóa đề thi VIP đã xuất bản","Truy cập lý thuyết và học liệu VIP nâng cao","Thanh toán một lần, không tự động gia hạn"]'::jsonb,
   true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "interval" = EXCLUDED."interval",
  "features" = EXCLUDED."features",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
