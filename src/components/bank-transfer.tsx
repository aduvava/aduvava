"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { paymentQrUrl, type TransferBank } from "@/lib/payment-qr";
export function BankTransfer({ id, bank, amount, reference, automatic = false }: { id: string; bank: TransferBank; amount: number; reference: string; automatic?: boolean }) {
 const router = useRouter(); const [status, setStatus] = useState("PENDING"); const [error, setError] = useState(""); const [qrError, setQrError] = useState(false);
 useEffect(() => {
   let active = true; let timer: ReturnType<typeof setTimeout>; const controller = new AbortController();
   async function poll() {
     try {
       const response = await fetch(`/api/payments/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal });
       if (!response.ok) throw new Error("Chưa kiểm tra được giao dịch. Hệ thống sẽ thử lại.");
       const data = await response.json(); if (!active) return;
       setError(""); setStatus(data.payment.status);
       if (data.payment.status === "PAID") { router.refresh(); return; }
       if (data.payment.status === "FAILED") return;
     } catch (e) { if (active) setError(e instanceof Error ? e.message : "Đang kết nối lại..."); }
     if (active) timer = setTimeout(poll, 5000);
   }
   void poll(); return () => { active = false; clearTimeout(timer); controller.abort(); };
 }, [id, router]);
 if (status === "PAID") return <div role="status" className="my-5 rounded-2xl bg-emerald-50 p-6 text-center font-bold text-emerald-700">Thanh toán thành công! Gói VIP đã được kích hoạt.</div>;
 if (status === "FAILED") return <p role="status" className="my-5 rounded-2xl bg-red-50 p-5 text-red-700">Giao dịch chưa được chấp nhận. Nếu đã chuyển tiền, liên hệ hỗ trợ kèm mã {reference}.</p>;
 return <div className="my-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm">
   <p className="text-center font-bold">Quét mã bằng ứng dụng ngân hàng</p>
   {!qrError ? <img src={paymentQrUrl(bank, amount, reference)} alt="Mã QR chuyển khoản cho đơn VIP này" width={240} height={240} className="mx-auto my-3 max-w-full rounded-xl bg-white" onError={() => setQrError(true)} /> : <p className="my-3 text-center">Không tải được QR. Dùng thông tin chuyển khoản bên dưới.</p>}
   <div className="space-y-1 break-words"><p>Ngân hàng: <strong>{bank.name}</strong></p><p>Số tài khoản: <strong className="select-all">{bank.accountNumber}</strong></p><p>Chủ tài khoản: <strong>{bank.accountHolder}</strong></p><p>Số tiền: <strong>{amount.toLocaleString("vi-VN")} đ</strong></p><p>Nội dung: <strong className="select-all">{reference}</strong></p></div>
   <p role="status" className="mt-3 text-slate-600">{error || (automatic ? "Đang chờ tiền vào. VIP sẽ tự kích hoạt khi xác nhận đủ số tiền và đúng nội dung chuyển khoản." : "Đang chờ xác nhận tiền vào từ quản trị viên.")}</p>
 </div>;
}
