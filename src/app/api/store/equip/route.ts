import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireUser } from "@/lib/api";
import { EQUIPMENT_SLOT_FIELDS, equipmentSlotFor } from "@/lib/store-equipment";

const equipSchema = z.object({ itemId: z.string().min(1) }).strict();

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { itemId } = equipSchema.parse(await readJson<unknown>(request));

    const purchase = await prisma.storePurchase.findFirst({
      where: { userId: user.id, itemId },
      include: { item: true },
    });
    if (!purchase) throw new HttpError(403, "Bạn cần sở hữu vật phẩm này trước khi sử dụng.");

    // Every cosmetic already purchased remains usable when removed from the
    // storefront, and even if old admin data incorrectly marks it consumable.
    const slot = equipmentSlotFor(purchase.item);
    if (!slot) throw new HttpError(400, "Vật phẩm này không có hiệu ứng trang bị. Bạn vẫn có thể dùng các tệp đã mua trong Kho đồ.");

    await prisma.user.update({
      where: { id: user.id },
      data: { [EQUIPMENT_SLOT_FIELDS[slot]]: itemId },
    });

    return jsonOk({
      equippedItemId: itemId,
      imageKey: purchase.item.imageKey,
      slot,
      message: `Đã trang bị ${purchase.item.name}.`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
