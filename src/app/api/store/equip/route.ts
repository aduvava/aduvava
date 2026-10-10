import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireUser } from "@/lib/api";

const equipSchema = z.object({ itemId: z.string().min(1) });

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
    const { itemId } = equipSchema.parse(await readJson<unknown>(request));

    const purchase = await prisma.storePurchase.findFirst({
      where: {
        userId: user.id,
        itemId,
        item: { category: { in: ["AVATAR", "EQUIPMENT"] }, isActive: true, isConsumable: false },
      },
      include: { item: true },
    });

    if (!purchase) throw new HttpError(403, "Bạn cần sở hữu vật phẩm này trước khi sử dụng.");

    const data = equipDataFor(itemId, purchase.item.category, purchase.item.metadata);
    if (!data) throw new HttpError(400, "Vật phẩm này chưa hỗ trợ trang bị.");

    await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return jsonOk({
      equippedItemId: itemId,
      imageKey: purchase.item.imageKey,
      slot: getMetadataKind(purchase.item.metadata) || purchase.item.category,
      message: `Đã trang bị ${purchase.item.name}.`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
