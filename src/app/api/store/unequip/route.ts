import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk, readJson, requireUser } from "@/lib/api";
import { EQUIPMENT_SLOT_FIELDS } from "@/lib/store-equipment";

const unequipSchema = z.object({
  slot: z.enum(["avatar", "avatarFrame", "nameColor", "title", "submitEffect"]),
}).strict();

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { slot } = unequipSchema.parse(await readJson<unknown>(request));
    // A user can only remove their own cosmetic selection. Purchases remain
    // unchanged, so they may re-equip any owned item without paying again.
    await prisma.user.update({
      where: { id: user.id },
      data: { [EQUIPMENT_SLOT_FIELDS[slot]]: null },
    });
    return jsonOk({ slot, message: "Đã tháo vật phẩm. Vật phẩm vẫn còn trong Kho đồ." });
  } catch (error) {
    return handleRouteError(error);
  }
}
