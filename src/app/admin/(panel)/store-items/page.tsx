import { AdminCatalogManager } from "@/components/admin/admin-catalog-manager";

export default function AdminStoreItemsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Cửa hàng EXP</p>
      <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Quản lý vật phẩm</h1>
      <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
        Thêm, sửa giá, màu, danh mục, tồn kho hoặc trạng thái bán trực tiếp. Vật phẩm đã có người mua chỉ nên ngừng bán, không xóa lịch sử.
      </p>
      <div className="mt-6"><AdminCatalogManager resource="store-items" /></div>
    </main>
  );
}
