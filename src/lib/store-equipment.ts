export const EQUIPMENT_SLOT_FIELDS = {
  avatar: "equippedAvatarItemId",
  avatarFrame: "equippedAvatarFrameId",
  nameColor: "equippedNameColorId",
  title: "equippedTitleId",
  submitEffect: "equippedSubmitEffectId",
} as const;

export type EquipmentSlot = keyof typeof EQUIPMENT_SLOT_FIELDS;

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  avatar: "Ảnh đại diện",
  avatarFrame: "Khung avatar",
  nameColor: "Màu tên",
  title: "Danh hiệu",
  submitEffect: "Hiệu ứng nộp bài",
};

/** Only visual, reusable purchases may occupy an equipment slot. */
export function equipmentSlotFor(item: {
  category: string;
  isConsumable: boolean;
  metadata: unknown;
}): EquipmentSlot | null {
  if (item.isConsumable) return null;
  if (item.category === "AVATAR") return "avatar";
  if (item.category !== "EQUIPMENT") return null;
  const kind = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
    ? (item.metadata as Record<string, unknown>).kind
    : null;
  return kind === "avatarFrame" || kind === "nameColor" || kind === "title" || kind === "submitEffect"
    ? kind : null;
}
