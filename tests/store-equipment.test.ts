import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EQUIPMENT_SLOT_FIELDS, EQUIPMENT_SLOT_LABELS, equipmentSlotFor, isReusableStoreItem,
} from "../src/lib/store-equipment";

const uploadedImage = "store-img-" + "a".repeat(32) + ".png";

describe("owned-item cosmetic inventory", () => {
  it("allows avatars and recognized decorative equipment in separate slots", () => {
    const item = { category: "AVATAR", isConsumable: false, metadata: null };
    assert.equal(equipmentSlotFor(item), "avatar");
    for (const kind of ["avatar", "avatarFrame", "nameColor", "title", "submitEffect"] as const) {
      assert.equal(equipmentSlotFor({ ...item, category: "EQUIPMENT", metadata: { kind } }), kind);
    }
  });

  it("restores legacy images with no kind as avatars, but not gift thumbnails or documents", () => {
    const image = { category: "EQUIPMENT", isConsumable: true, metadata: { imageFile: uploadedImage } };
    assert.equal(equipmentSlotFor(image), "avatar");
    assert.equal(isReusableStoreItem(image), true);
    assert.equal(equipmentSlotFor({ ...image, category: "GIFT" }), null);
    assert.equal(equipmentSlotFor({ ...image, category: "STUDY_PACK" }), null);
    assert.equal(equipmentSlotFor({ ...image, metadata: { imageFile: "not-an-upload.png" } }), null);
    assert.equal(equipmentSlotFor({ ...image, metadata: { kind: "unknown", imageFile: uploadedImage } }), null);
  });

  it("does not block previously bought cosmetics because of a mistaken consumable flag", () => {
    assert.equal(equipmentSlotFor({ category: "AVATAR", isConsumable: true, metadata: null }), "avatar");
    assert.equal(isReusableStoreItem({ category: "AVATAR", isConsumable: true, metadata: null }), true);
    assert.equal(isReusableStoreItem({ category: "EQUIPMENT", isConsumable: true, metadata: { kind: "nameColor" } }), true);
    assert.equal(isReusableStoreItem({ category: "HELP", isConsumable: true, metadata: { kind: "extraTime" } }), false);
  });

  it("prevents consumables, downloadable items and unrecognized equipment from equipping", () => {
    assert.equal(equipmentSlotFor({ category: "HELP", isConsumable: true, metadata: { kind: "avatarFrame" } }), null);
    assert.equal(equipmentSlotFor({ category: "STUDY_PACK", isConsumable: false, metadata: { kind: "avatarFrame" } }), null);
    assert.equal(equipmentSlotFor({ category: "EQUIPMENT", isConsumable: false, metadata: { kind: "unauthorized" } }), null);
    assert.equal(equipmentSlotFor({ category: "EQUIPMENT", isConsumable: false, metadata: null }), null);
  });

  it("maps five cosmetic choices to the correct user account fields", () => {
    assert.deepEqual(Object.keys(EQUIPMENT_SLOT_FIELDS).sort(), ["avatar", "avatarFrame", "nameColor", "submitEffect", "title"].sort());
    assert.equal(EQUIPMENT_SLOT_FIELDS.avatar, "equippedDashboardImageId");
    assert.equal(EQUIPMENT_SLOT_FIELDS.avatarFrame, "equippedAvatarFrameId");
    assert.equal(EQUIPMENT_SLOT_FIELDS.nameColor, "equippedNameColorId");
    assert.equal(EQUIPMENT_SLOT_FIELDS.title, "equippedTitleId");
    assert.equal(EQUIPMENT_SLOT_FIELDS.submitEffect, "equippedSubmitEffectId");
    assert.equal(EQUIPMENT_SLOT_LABELS.avatar, "Ảnh trang chủ");
  });
});
