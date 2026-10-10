import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Storefront } from "@/components/storefront";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Cửa hàng EXP | Ava",
  description: "Dùng EXP để đổi vật phẩm học tập và hình ảnh trong Ava.",
};

export default async function StorePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=student&callbackUrl=/dich-vu");

  const [account, items, purchases, walletTransactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        coins: true,
        exp: true,
        equippedAvatarFrameId: true,
        equippedNameColorId: true,
        equippedTitleId: true,
        equippedSubmitEffectId: true,
        equippedAvatarItemId: true,
      },
    }),
    prisma.storeItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.storePurchase.findMany({
      where: { userId: user.id },
      select: { itemId: true },
    }),
    prisma.walletTransaction.findMany({
      where: { userId: user.id, currency: { in: ["COIN", "EXP"] } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);
  const inventory = purchases.reduce<Record<string, number>>((stats, purchase) => {
    stats[purchase.itemId] = (stats[purchase.itemId] ?? 0) + 1;
    return stats;
  }, {});

  return (
    <Storefront
      initialCoin={account?.coins ?? 0}
      initialExp={account?.exp ?? 0}
      items={items.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price,
        currency: item.currency,
        imageKey: item.imageKey,
        badge: item.badge,
        isFeatured: item.isFeatured,
        isConsumable: item.isConsumable,
        stock: item.stock,
        metadata: item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : null,
      }))}
      initialOwnedItemIds={Array.from(new Set(purchases.map((purchase) => purchase.itemId)))}
      initialInventory={inventory}
      initialEquipped={{
        avatarFrameId: account?.equippedAvatarFrameId ?? null,
        nameColorId: account?.equippedNameColorId ?? null,
        titleId: account?.equippedTitleId ?? null,
        submitEffectId: account?.equippedSubmitEffectId ?? null,
        avatarItemId: account?.equippedAvatarItemId ?? null,
      }}
      initialHistory={walletTransactions.map((transaction) => ({
        id: transaction.id,
        currency: transaction.currency,
        amount: transaction.amount,
        note: transaction.note,
        createdAt: transaction.createdAt.toISOString(),
      }))}
    />
  );
}
