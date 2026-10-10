import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminStoreItemsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Cửa hàng EXP</p>
      <h1 className="mt-3 text-4xl font-black text-slate-950">Admin · Vật phẩm cửa hàng</h1>
      <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
        Thêm, sửa giá EXP, danh mục, tồn kho và trạng thái bán. Danh mục hợp lệ: EQUIPMENT, HELP, STUDY_PACK, GIFT, AVATAR.
      </p>
      <div className="mt-5 rounded-[1.75rem] border border-orange-100 bg-orange-50/70 p-5 text-sm font-semibold leading-7 text-slate-700">
        <p className="font-black text-slate-950">Cách thêm vật phẩm:</p>
        <p>1. Sửa JSON ở khung bên trái.</p>
        <p>
          2. Đặt slug không trùng, ví dụ: <code className="rounded bg-white px-2 py-1">trang-bi-focus-2</code>.
        </p>
        <p>3. Chọn category, giá EXP, imageKey rồi bấm Create.</p>
        <p>4. Muốn sửa vật phẩm cũ thì copy ID bên danh sách, dán vào ô ID và bấm Update.</p>
      </div>
      <div className="mt-8">
        <AdminResourceManager
          resource="store-items"
          defaultPayload={{
            slug: "vat-pham-moi",
            name: "Vật phẩm mới",
            description: "Mô tả vật phẩm",
            category: "EQUIPMENT",
            price: 200,
            currency: "EXP",
            imageKey: "orange",
            badge: "MỚI",
            isFeatured: false,
            isConsumable: false,
            isActive: true,
            stock: null,
            sortOrder: 10,
          }}
        />
      </div>
    </main>
  );
}
