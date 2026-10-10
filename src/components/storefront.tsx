"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Crown,
  Gem,
  Gift,
  History,
  Image as ImageIcon,
  Palette,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Timer,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";

type Category = "EQUIPMENT" | "HELP" | "STUDY_PACK" | "GIFT" | "AVATAR";
type Currency = "COIN" | "EXP";
type StoreMetadata = Record<string, unknown>;

type StoreItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  currency: Currency;
  imageKey: string;
  badge: string | null;
  isFeatured: boolean;
  isConsumable: boolean;
  stock: number | null;
  metadata: StoreMetadata | null;
};

type HistoryItem = {
  id: string;
  currency: Currency;
  amount: number;
  note: string;
  createdAt: string;
};

type EquippedItems = {
  avatarFrameId: string | null;
  nameColorId: string | null;
  titleId: string | null;
  submitEffectId: string | null;
  avatarItemId: string | null;
};

type StorefrontProps = {
  initialCoin: number;
  initialExp: number;
  items: StoreItem[];
  initialOwnedItemIds: string[];
  initialInventory: Record<string, number>;
  initialEquipped: EquippedItems;
  initialHistory: HistoryItem[];
};

const categories: { id: Category; label: string; description: string; icon: typeof ShoppingBag }[] = [
  { id: "EQUIPMENT", label: "Trang bị", description: "Khung avatar, màu tên, danh hiệu và hiệu ứng nộp bài.", icon: Palette },
  { id: "HELP", label: "Trợ giúp", description: "Vật phẩm tiêu hao hỗ trợ khi làm bài khó.", icon: Zap },
  { id: "STUDY_PACK", label: "Gói học tập", description: "Bộ đề, tài liệu và phân tích học tập độc quyền.", icon: BookOpen },
  { id: "GIFT", label: "Đổi quà", description: "Voucher, dịch vụ số và quà lưu niệm cần admin xác nhận.", icon: Gift },
  { id: "AVATAR", label: "Avatar", description: "Bộ sưu tập ảnh đại diện độc quyền.", icon: ImageIcon },
];

const visualStyles: Record<string, { gradient: string; icon: typeof Sparkles; text: string }> = {
  "paper-crane": { gradient: "from-sky-100 via-white to-orange-100", icon: Sparkles, text: "text-sky-600" },
  "butterfly-glow": { gradient: "from-violet-500 via-fuchsia-500 to-cyan-300", icon: WandSparkles, text: "text-white" },
  "gold-laurel": { gradient: "from-amber-200 via-yellow-400 to-orange-600", icon: Crown, text: "text-white" },
  "name-blue": { gradient: "from-blue-100 via-sky-200 to-blue-600", icon: Palette, text: "text-blue-700" },
  "name-pink": { gradient: "from-pink-100 via-fuchsia-300 to-rose-500", icon: Palette, text: "text-white" },
  "title-focus": { gradient: "from-emerald-100 via-teal-300 to-emerald-700", icon: Star, text: "text-white" },
  "title-night": { gradient: "from-indigo-950 via-violet-700 to-slate-900", icon: Star, text: "text-white" },
  firework: { gradient: "from-orange-500 via-rose-500 to-slate-950", icon: Sparkles, text: "text-white" },
  meteor: { gradient: "from-slate-950 via-blue-900 to-cyan-400", icon: Sparkles, text: "text-white" },
  "hope-star": { gradient: "from-yellow-100 via-amber-300 to-orange-500", icon: Star, text: "text-white" },
  "fifty-fifty": { gradient: "from-slate-900 via-blue-700 to-sky-400", icon: Shield, text: "text-white" },
  "time-plus": { gradient: "from-cyan-100 via-sky-300 to-blue-700", icon: Timer, text: "text-white" },
  guardian: { gradient: "from-emerald-100 via-lime-300 to-teal-700", icon: Shield, text: "text-white" },
  "literature-pack": { gradient: "from-rose-100 via-orange-200 to-amber-600", icon: BookOpen, text: "text-orange-900" },
  "english-pack": { gradient: "from-blue-100 via-indigo-200 to-blue-700", icon: BookOpen, text: "text-white" },
  analytics: { gradient: "from-slate-900 via-indigo-700 to-emerald-400", icon: Sparkles, text: "text-white" },
  "pdf-pack": { gradient: "from-red-100 via-orange-300 to-red-600", icon: BookOpen, text: "text-white" },
  "voucher-cafe": { gradient: "from-amber-100 via-orange-300 to-yellow-800", icon: Gift, text: "text-white" },
  "phone-card": { gradient: "from-sky-100 via-cyan-300 to-blue-700", icon: Gift, text: "text-white" },
  souvenir: { gradient: "from-emerald-100 via-teal-300 to-slate-800", icon: Gift, text: "text-white" },
  detective: { gradient: "from-amber-100 via-orange-200 to-slate-800", icon: ImageIcon, text: "text-slate-900" },
  ukulele: { gradient: "from-pink-100 via-rose-200 to-orange-400", icon: ImageIcon, text: "text-rose-700" },
  "animated-star": { gradient: "from-slate-950 via-violet-700 to-yellow-300", icon: Sparkles, text: "text-white" },
  orange: { gradient: "from-orange-300 via-orange-500 to-red-600", icon: Sparkles, text: "text-white" },
};

function getKind(item: StoreItem) {
  const kind = item.metadata?.kind;
  return typeof kind === "string" ? kind : "";
}

function getEquippedIdFor(item: StoreItem, equipped: EquippedItems) {
  if (item.category === "AVATAR") return equipped.avatarItemId;
  const kind = getKind(item);
  if (kind === "avatarFrame") return equipped.avatarFrameId;
  if (kind === "nameColor") return equipped.nameColorId;
  if (kind === "title") return equipped.titleId;
  if (kind === "submitEffect") return equipped.submitEffectId;
  return null;
}

function slotName(item: StoreItem) {
  const kind = getKind(item);
  if (item.category === "AVATAR") return "Avatar";
  if (kind === "avatarFrame") return "Khung avatar";
  if (kind === "nameColor") return "Màu tên";
  if (kind === "title") return "Danh hiệu";
  if (kind === "submitEffect") return "Hiệu ứng nộp bài";
  if (kind === "extraTime") return `+${String(item.metadata?.minutes ?? 5)} phút`;
  if (kind === "fiftyFifty") return "Ẩn 2 đáp án sai";
  if (kind === "hopeStar") return "Nhân EXP câu hỏi";
  if (kind === "guardian") return "Bảo vệ chuỗi đúng";
  if (kind === "voucher" || kind === "realReward") return "Admin duyệt";
  if (kind === "examPack") return "Mở khóa bộ đề";
  if (kind === "analyticsPack") return "Phân tích nâng cao";
  return categories.find((category) => category.id === item.category)?.label ?? "Vật phẩm";
}

function HistoryModal({ history, onClose }: { history: HistoryItem[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="max-h-[82vh] w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Lịch sử giao dịch</h2>
            <p className="mt-1 text-sm text-slate-500">Biến động EXP và vật phẩm đã mua.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[65vh] space-y-2 overflow-y-auto p-5">
          {history.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-600">
                <Gem className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-800">{item.note}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("vi-VN")}</p>
              </div>
              <span className={clsx("font-black", item.amount >= 0 ? "text-emerald-600" : "text-rose-500")}>
                {item.amount >= 0 ? "+" : ""}
                {item.amount.toLocaleString("vi-VN")} {item.currency}
              </span>
            </div>
          ))}
          {!history.length ? <p className="py-12 text-center text-sm text-slate-500">Chưa có giao dịch.</p> : null}
        </div>
      </div>
    </div>
  );
}

function PriceAmount({ amount, currency }: { amount: number; currency: Currency }) {
  const isExp = currency === "EXP";
  return (
    <span className="inline-flex items-center gap-2 font-black text-slate-900">
      <Gem className={clsx("h-5 w-5", isExp ? "fill-blue-500 text-blue-500" : "fill-orange-400 text-orange-500")} />
      {amount.toLocaleString("vi-VN")} {currency}
    </span>
  );
}

export function Storefront({
  initialCoin,
  initialExp,
  items,
  initialOwnedItemIds,
  initialInventory,
  initialEquipped,
  initialHistory,
}: StorefrontProps) {
  const [category, setCategory] = useState<Category>("EQUIPMENT");
  const [coin, setCoin] = useState(initialCoin);
  const [exp, setExp] = useState(initialExp);
  const [ownedItemIds, setOwnedItemIds] = useState(new Set(initialOwnedItemIds));
  const [inventory, setInventory] = useState(initialInventory);
  const [equipped, setEquipped] = useState<EquippedItems>(initialEquipped);
  const [history, setHistory] = useState(initialHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    function openHistory() {
      setShowHistory(true);
    }

    window.addEventListener("open-store-history", openHistory);
    if (new URLSearchParams(window.location.search).get("history") === "1") {
      setShowHistory(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
    return () => window.removeEventListener("open-store-history", openHistory);
  }, []);

  const filteredItems = useMemo(() => items.filter((item) => item.category === category), [category, items]);
  const activeCategory = categories.find((item) => item.id === category) ?? categories[0];

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function markEquipped(item: StoreItem) {
    const kind = getKind(item);
    setEquipped((current) => {
      if (item.category === "AVATAR") return { ...current, avatarItemId: item.id };
      if (kind === "avatarFrame") return { ...current, avatarFrameId: item.id };
      if (kind === "nameColor") return { ...current, nameColorId: item.id };
      if (kind === "title") return { ...current, titleId: item.id };
      if (kind === "submitEffect") return { ...current, submitEffectId: item.id };
      return current;
    });
  }

  async function purchase(item: StoreItem) {
    setBusyId(item.id);
    const response = await fetch("/api/store/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id }),
    });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      notify(data.error ?? "Không thể mua vật phẩm.");
      return;
    }

    setCoin(data.balance.coins);
    setExp(data.balance.exp);
    setOwnedItemIds((current) => new Set([...current, item.id]));
    setInventory((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }));
    if (data.equippedItemId) markEquipped(item);
    setHistory((current) => [{
      id: data.purchase.id,
      currency: item.currency,
      amount: -item.price,
      note: `Mua ${item.name}`,
      createdAt: new Date().toISOString(),
    }, ...current]);
    notify(data.equippedItemId ? `Đã mua và trang bị ${item.name}.` : `Đã mua ${item.name}.`);
  }

  async function equip(item: StoreItem) {
    setBusyId(item.id);
    const response = await fetch("/api/store/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id }),
    });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      notify(data.error ?? "Không thể trang bị vật phẩm này.");
      return;
    }
    markEquipped(item);
    notify(data.message ?? `Đã trang bị ${item.name}.`);
  }

  return (
    <div className="store-page min-h-screen bg-[#fffdf7] pb-24">
      <div className="mx-auto max-w-[1660px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-8 w-8 text-orange-500" />
            <div>
              <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">Cửa hàng Ava</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">Dùng EXP để mở khóa giao diện, trợ giúp, nội dung học tập và quà đổi thưởng.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-600">
              <Gem className="h-5 w-5 fill-orange-400" /> {coin.toLocaleString("vi-VN")} COIN
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-600">
              <Gem className="h-5 w-5 fill-blue-500" /> {exp.toLocaleString("vi-VN")} EXP
            </span>
            <button type="button" onClick={() => setShowHistory(true)} aria-label="Lịch sử giao dịch" className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-orange-200 hover:text-orange-500">
              <History className="h-5 w-5" />
            </button>
          </div>
        </header>

        <section className="mt-8">
          <nav className="flex gap-3 overflow-x-auto pb-3">
            {categories.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={clsx("flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-extrabold transition", category === item.id ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-200" : "border-slate-200 bg-white text-slate-500 hover:border-orange-200")}>
                  <Icon className="h-4 w-4" /> {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-5 rounded-[1.6rem] border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">{activeCategory.label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">{activeCategory.description}</p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {filteredItems.map((item) => {
              const visual = visualStyles[item.imageKey] ?? visualStyles.orange;
              const VisualIcon = visual.icon;
              const owned = ownedItemIds.has(item.id);
              const equippedId = getEquippedIdFor(item, equipped);
              const isEquippable = item.category === "AVATAR" || ["avatarFrame", "nameColor", "title", "submitEffect"].includes(getKind(item));
              const isEquipped = equippedId === item.id;
              const soldOut = item.stock === 0;
              const count = inventory[item.id] ?? 0;

              return (
                <article key={item.id} className="w-full overflow-hidden rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_10px_24px_rgba(72,48,26,.06)]">
                  <div className={clsx("relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[1.25rem] bg-gradient-to-br", visual.gradient)}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,.55),transparent_28%)]" />
                    <VisualIcon className={clsx("relative h-16 w-16 drop-shadow-xl", visual.text)} strokeWidth={1.4} />
                    {item.badge ? <span className="absolute left-0 top-0 rounded-br-2xl bg-orange-500 px-4 py-2 text-[10px] font-black uppercase text-white">{item.badge}</span> : null}
                    {isEquipped ? <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-3 py-1.5 text-[10px] font-black uppercase text-white shadow-lg">Đang dùng</span> : null}
                    {count && item.isConsumable ? <span className="absolute bottom-3 right-3 rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black uppercase text-white">Có {count}</span> : null}
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-3">
                    <h3 className="text-lg font-black text-slate-950">{item.name}</h3>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">{slotName(item)}</span>
                  </div>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{item.description}</p>
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <PriceAmount amount={item.price} currency={item.currency} />
                    {owned && isEquippable && !item.isConsumable ? (
                      <button
                        type="button"
                        onClick={() => equip(item)}
                        disabled={isEquipped || busyId === item.id}
                        className={clsx("rounded-2xl px-5 py-3 text-sm font-black transition", isEquipped ? "bg-emerald-50 text-emerald-600" : "bg-orange-500 text-white hover:bg-orange-600", busyId === item.id && "cursor-not-allowed bg-slate-200 text-slate-500")}
                      >
                        {busyId === item.id ? "Đang xử lý..." : isEquipped ? "Đang trang bị" : "Trang bị"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => purchase(item)}
                        disabled={(owned && !item.isConsumable) || soldOut || busyId === item.id}
                        className={clsx(
                          "rounded-2xl px-5 py-3 text-sm font-black transition",
                          owned && !item.isConsumable ? "bg-emerald-50 text-emerald-600" : "bg-slate-950 text-white hover:bg-orange-500",
                          (soldOut || busyId === item.id) && "cursor-not-allowed bg-slate-200 text-slate-500",
                        )}
                      >
                        {busyId === item.id ? "Đang xử lý..." : soldOut ? "Hết hàng" : owned && !item.isConsumable ? "Đã sở hữu" : "Mua ngay"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!filteredItems.length ? <p className="mt-8 rounded-3xl bg-white p-12 text-center text-sm text-slate-500">Danh mục này chưa có vật phẩm.</p> : null}
        </section>
      </div>

      {showHistory ? <HistoryModal history={history} onClose={() => setShowHistory(false)} /> : null}
      {toast ? <div className="fixed bottom-7 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-xl"><Check className="h-4 w-4 text-emerald-400" /> {toast}</div> : null}
    </div>
  );
}
