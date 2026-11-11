"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen, Check, Crown, Download, Gift, Image as ImageIcon,
  PackageCheck, Palette, ShieldCheck, ShoppingBag, Sparkles, UserRound,
} from "lucide-react";
import { clsx } from "clsx";
import { getStoreImageUrl } from "@/lib/store-image-url";
import {
  EQUIPMENT_SLOT_LABELS,
  equipmentSlotFor,
  type EquipmentSlot,
} from "@/lib/store-equipment";

type InventoryItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  imageKey: string;
  isActive: boolean;
  isConsumable: boolean;
  count: number;
  metadata: { kind: string | null; imageFile: string | null };
  attachmentName: string | null;
};

type Equipped = Record<EquipmentSlot, string | null>;
type Filter = "all" | "AVATAR" | "EQUIPMENT" | "other";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "AVATAR", label: "Avatar" },
  { id: "EQUIPMENT", label: "Trang bị" },
  { id: "other", label: "Vật phẩm khác" },
];

const slots: EquipmentSlot[] = ["avatar", "avatarFrame", "nameColor", "title", "submitEffect"];

function CategoryIcon({ category }: { category: string }) {
  if (category === "AVATAR") return <UserRound className="h-12 w-12 text-orange-500" />;
  if (category === "EQUIPMENT") return <Palette className="h-12 w-12 text-blue-600" />;
  if (category === "STUDY_PACK") return <BookOpen className="h-12 w-12 text-blue-600" />;
  if (category === "GIFT") return <Gift className="h-12 w-12 text-orange-500" />;
  return <Sparkles className="h-12 w-12 text-orange-500" />;
}

export function StoreInventory({
  items,
  initialEquipped,
}: {
  items: InventoryItem[];
  initialEquipped: Equipped;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [equipped, setEquipped] = useState<Equipped>(initialEquipped);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const filtered = items.filter((item) =>
    filter === "all" ||
    (filter === "other" ? item.category !== "AVATAR" && item.category !== "EQUIPMENT" : item.category === filter)
  );
  const namesById = new Map(items.map((item) => [item.id, item.name]));
  const equippedCount = slots.filter((slot) => equipped[slot] !== null).length;

  async function changeEquipment(slot: EquipmentSlot, item?: InventoryItem) {
    if (busy) return;
    if (item && equipmentSlotFor(item) !== slot) return;
    setBusy(item?.id ?? slot);
    setMessage("");
    try {
      const response = await fetch(item ? "/api/store/equip" : "/api/store/unequip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item ? { itemId: item.id } : { slot }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Không thể thay đổi vật phẩm.");
      setEquipped((current) => ({ ...current, [slot]: item?.id ?? null }));
      setMessage(result.message || (item ? "Đã trang bị vật phẩm." : "Đã tháo vật phẩm."));
      // Refresh the shared site header, dashboard avatar and other Server Components.
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể thay đổi vật phẩm.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="min-h-screen bg-[#fffdf7] pb-28">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Tài khoản Educhi</p>
            <div className="mt-2 flex items-center gap-3">
              <PackageCheck className="h-9 w-9 shrink-0 text-orange-500" />
              <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">Kho đồ của tôi</h1>
            </div>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Tất cả vật phẩm đã mua sẽ nằm ở đây. Bạn có thể đổi avatar, khung, màu tên và hiệu ứng bất cứ lúc nào, không cần mua lại.
            </p>
          </div>
          <Link href="/dich-vu" className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-black text-orange-600 hover:bg-orange-50">
            <ShoppingBag className="h-4 w-4" /> Đến cửa hàng
          </Link>
        </header>

        <section className="mt-6 rounded-[1.6rem] border border-orange-100 bg-white p-4 shadow-sm sm:p-6" aria-label="Vật phẩm đang trang bị">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><ShieldCheck className="h-5 w-5 text-orange-500" /> Đang sử dụng</h2>
            <span className="text-xs font-bold text-slate-500">{equippedCount}/5 vị trí đã trang bị</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {slots.map((slot) => {
              const itemId = equipped[slot];
              return (
                <div key={slot} className="min-w-0 rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">{EQUIPMENT_SLOT_LABELS[slot]}</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-900">{itemId ? namesById.get(itemId) ?? "Đang sử dụng" : "Mặc định"}</p>
                  {itemId ? (
                    <button type="button" disabled={Boolean(busy)} onClick={() => void changeEquipment(slot)}
                      className="mt-2 rounded-lg bg-white px-3 py-1.5 text-xs font-black text-rose-600 ring-1 ring-rose-100 hover:bg-rose-50 disabled:opacity-50">
                      {busy === slot ? "Đang tháo..." : "Tháo ra"}
                    </button>
                  ) : <span className="mt-2 block text-xs font-semibold text-slate-400">Chưa chọn</span>}
                </div>
              );
            })}
          </div>
        </section>

        {message ? <p role="status" aria-live="polite" className="mt-4 rounded-xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-900">{message}</p> : null}

        <section className="mt-7" aria-label="Danh sách vật phẩm sở hữu">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-950">Vật phẩm đã mua ({items.length})</h2>
            <p className="text-xs font-semibold text-slate-500">Vật phẩm đã ngừng bán vẫn thuộc sở hữu của bạn.</p>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Lọc kho đồ">
            {filters.map((option) => (
              <button key={option.id} type="button" onClick={() => setFilter(option.id)}
                className={clsx("shrink-0 rounded-xl border px-4 py-2.5 text-sm font-black transition",
                  filter === option.id ? "border-orange-500 bg-orange-500 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-orange-300")}>
                {option.label}
              </button>
            ))}
          </nav>

          {filtered.length ? (
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item) => {
                const slot = equipmentSlotFor(item);
                const isEquipped = slot ? equipped[slot] === item.id : false;
                const img = getStoreImageUrl(item.metadata.imageFile);
                return (
                  <article key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-orange-100 bg-white p-4 shadow-sm">
                    <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 via-white to-blue-50">
                      {img ? (
                        <img src={img} alt={item.name} className="h-full w-full object-contain p-3" />
                      ) : <CategoryIcon category={item.category} />}
                      {isEquipped ? <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white">Đang dùng</span> : null}
                    </div>
                    <div className="mt-4 flex-1">
                      <h3 className="font-black text-slate-950">{item.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{item.description}</p>
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        {item.isConsumable ? `Đã mua ${item.count} lượt` : "Đã sở hữu"}
                        {!item.isActive ? " · Ngừng bán" : ""}
                      </p>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {slot ? (
                        <button type="button" disabled={Boolean(busy)}
                          onClick={() => void changeEquipment(slot, isEquipped ? undefined : item)}
                          className={clsx("min-h-11 rounded-xl px-4 py-2 text-sm font-black disabled:opacity-50",
                            isEquipped ? "border border-rose-200 bg-rose-50 text-rose-700" : "bg-orange-500 text-white hover:bg-orange-600")}>
                          {busy === (isEquipped ? slot : item.id) ? "Đang xử lý..." : isEquipped ? "Tháo ra" : "Trang bị"}
                        </button>
                      ) : (
                        <div className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-sm font-black text-emerald-700">
                          <Check className="h-4 w-4" /> Có trong kho
                        </div>
                      )}
                      {item.attachmentName ? (
                        <a href={`/api/store/items/${item.id}/download`}
                          className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-700 hover:bg-blue-100">
                          <Download className="h-4 w-4 shrink-0" /> <span className="min-w-0 break-all">Tải: {item.attachmentName}</span>
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-orange-200 bg-white px-6 py-14 text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-orange-300" />
              <h3 className="mt-3 text-lg font-black text-slate-800">{items.length ? "Chưa có vật phẩm thuộc nhóm này" : "Kho đồ hiện chưa có vật phẩm"}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Mua vật phẩm tại Cửa hàng EXP, sau đó trở lại đây để thay đổi và trang bị tùy thích.</p>
              <Link href="/dich-vu" className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white">Khám phá cửa hàng</Link>
            </div>
          )}
        </section>
        <p className="mt-5 flex items-start gap-2 text-xs font-semibold leading-5 text-slate-500">
          <Crown className="mt-0.5 h-4 w-4 shrink-0" />
          Kho đồ lưu lịch sử sở hữu. Đổi hoặc tháo vật phẩm trang trí không trừ thêm EXP hay Coin.
        </p>
      </div>
    </div>
  );
}
