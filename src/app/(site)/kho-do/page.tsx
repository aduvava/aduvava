import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StoreInventory } from "@/components/store-inventory";

export const metadata: Metadata = {
  title: "Kho đồ của tôi | Educhi",
  description: "Xem vật phẩm đã mua, thay ảnh lớn trang chủ, khung và hiệu ứng.",
};
export const dynamic = "force-dynamic";

export default async function MyInventoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=student&callbackUrl=/kho-do");

  const [account, owned] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        equippedAvatarItemId: true, equippedDashboardImageId: true, equippedAvatarFrameId: true,
        equippedNameColorId: true, equippedTitleId: true,
        equippedSubmitEffectId: true,
      },
    }),
    prisma.storePurchase.groupBy({
      by: ["itemId"],
      where: { userId: user.id },
      _count: { id: true },
    }),
  ]);

  const ownedItems = owned.length ? await prisma.storeItem.findMany({
    where: { id: { in: owned.map((entry) => entry.itemId) } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  }) : [];
  const counts = new Map(owned.map((entry) => [entry.itemId, entry._count.id]));

  return (
    <StoreInventory
      items={ownedItems.map((item) => {
        const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
          ? item.metadata as Record<string, unknown> : {};
        const attached = metadata.downloadFile && typeof metadata.downloadFile === "object" && !Array.isArray(metadata.downloadFile)
          ? metadata.downloadFile as Record<string, unknown> : null;
        return {
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          imageKey: item.imageKey,
          isActive: item.isActive,
          isConsumable: item.isConsumable,
          count: counts.get(item.id) ?? 0,
          metadata: {
            kind: typeof metadata.kind === "string" ? metadata.kind : null,
            imageFile: typeof metadata.imageFile === "string" ? metadata.imageFile : null,
          },
          attachmentName: typeof attached?.originalName === "string" ? attached.originalName : null,
        };
      })}
      initialEquipped={{
        avatar: account?.equippedDashboardImageId ?? account?.equippedAvatarItemId ?? null,
        avatarFrame: account?.equippedAvatarFrameId ?? null,
        nameColor: account?.equippedNameColorId ?? null,
        title: account?.equippedTitleId ?? null,
        submitEffect: account?.equippedSubmitEffectId ?? null,
      }}
    />
  );
}
