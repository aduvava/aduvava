export const EQUIPMENT_SLOT_FIELDS = {
  avatar: "equippedDashboardImageId",
  avatarFrame: "equippedAvatarFrameId",
  nameColor: "equippedNameColorId",
  title: "equippedTitleId",
  submitEffect: "equippedSubmitEffectId",
} as const;

export type EquipmentSlot = keyof typeof EQUIPMENT_SLOT_FIELDS;

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  avatar: "Ảnh trang chủ",
  avatarFrame: "Khung avatar",
  nameColor: "Màu tên",
  title: "Danh hiệu",
  submitEffect: "Hiệu ứng nộp bài",
};

type StoreCosmetic = {
  category: string;
  isConsumable: boolean;
  metadata: unknown;
};

const IMAGE_FILE_NAME = /^store-img-[0-9a-f]{32}\.(?:png|jpe?g|webp|gif)$/;

/**
 * Cosmetic purchases can always be worn, regardless of a legacy admin flag
 * marking them "consumable". That flag formerly had a misleading label.
 *
 * Legacy custom pictures were often saved in EQUIPMENT with an image upload
 * but without a metadata kind. Recognize those as avatars, without treating
 * ordinary shop thumbnails for gifts, help items or study packs as avatars.
 */
export function equipmentSlotFor(item: StoreCosmetic): EquipmentSlot | null {
  if (item.category === "AVATAR") return "avatar";
  if (item.category !== "EQUIPMENT") return null;

  const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
    ? item.metadata as Record<string, unknown>
    : {};
  const kind = metadata.kind;
  if (kind === "avatar") return "avatar";
  if (kind === "avatarFrame" || kind === "nameColor" || kind === "title" || kind === "submitEffect") return kind;
  if ((kind === null || kind === undefined || kind === "") &&
    typeof metadata.imageFile === "string" && IMAGE_FILE_NAME.test(metadata.imageFile)) {
    return "avatar";
  }
  return null;
}

/** A decoration is not purchased again just because old data marked it consumable. */
export function isReusableStoreItem(item: StoreCosmetic): boolean {
  return !item.isConsumable || equipmentSlotFor(item) !== null;
}
