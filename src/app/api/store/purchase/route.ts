import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireUser } from "@/lib/api";

const purchaseSchema = z.object({ itemId: z.string().min(1) });

function getMetadataKind(metadata: unknown) {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return "";
  const kind = (metadata as Record<string, unknown>).kind;
  return typeof kind === "string" ? kind : "";
}

function equipDataFor(itemId: string, category: string, metadata: unknown) {
  if (category === "AVATAR") return { equippedAvatarItemId: itemId };

  const kind = getMetadataKind(metadata);
  if (kind === "avatarFrame") return { equippedAvatarFrameId: itemId };
  if (kind === "nameColor") return { equippedNameColorId: itemId };
  if (kind === "title") return { equippedTitleId: itemId };
  if (kind === "submitEffect") return { equippedSubmitEffectId: itemId };
  return null;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { itemId } = purchaseSchema.parse(await readJson<unknown>(request));
    const reference = `BUY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.storeItem.findUnique({ where: { id: itemId } });
      if (!item?.isActive) throw new HttpError(404, "Vật phẩm không tồn tại hoặc đã ngừng bán.");
      const balanceField = item.currency === "COIN" ? "coins" : "exp";

      if (!item.isConsumable) {
        const owned = await tx.storePurchase.findFirst({ where: { userId: user.id, itemId } });
        if (owned) throw new HttpError(409, "Bạn đã sở hữu vật phẩm này.");
      }

      if (item.stock !== null) {
        const stockUpdate = await tx.storeItem.updateMany({
          where: { id: item.id, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } },
        });
        if (!stockUpdate.count) throw new HttpError(409, "Vật phẩm đã hết hàng.");
      }

      const balanceUpdate = await tx.user.updateMany({
        where: { id: user.id, [balanceField]: { gte: item.price } },
        data: { [balanceField]: { decrement: item.price } },
      });
      if (!balanceUpdate.count) throw new HttpError(409, `Không đủ ${item.currency} để mua vật phẩm.`);

      const purchase = await tx.storePurchase.create({
        data: {
          userId: user.id,
          itemId: item.id,
          price: item.price,
          currency: item.currency,
        },
      });

      const equippedData = !item.isConsumable ? equipDataFor(item.id, item.category, item.metadata) : null;
      if (equippedData) {
        await tx.user.update({
          where: { id: user.id },
          data: equippedData,
        });
      }

      await tx.walletTransaction.create({
        data: {
          userId: user.id,
          currency: item.currency,
          amount: -item.price,
          reason: "STORE_PURCHASE",
          reference,
          note: `Mua ${item.name}`,
          metadata: { itemId: item.id, purchaseId: purchase.id, kind: getMetadataKind(item.metadata) },
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          title: "Mua vật phẩm thành công",
          message: `Bạn đã mua ${item.name} với giá ${item.price.toLocaleString("vi-VN")} ${item.currency}.`,
          href: "/dich-vu",
        },
      });

      const balance = await tx.user.findUnique({
        where: { id: user.id },
        select: { coins: true, exp: true },
      });

      return {
        purchase,
        item,
        balance,
        equippedItemId: equippedData ? item.id : null,
        equippedSlot: equippedData ? getMetadataKind(item.metadata) || item.category : null,
      };
    });

    return jsonOk(result, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
