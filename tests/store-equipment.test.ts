import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EQUIPMENT_SLOT_FIELDS, EQUIPMENT_SLOT_LABELS, equipmentSlotFor,
} from "../src/lib/store-equipment";

describe("owned-item cosmetic inventory", () => {
  it("allows owned avatars and recognized equipment kinds to occupy separate slots", () => {
    const item = { category: "AVATAR", isConsumable: false, metadata: null };
    assert.equal(equipmentSlotFor(item), "avatar");
    for (const kind of ["avatarFrame", "nameColor", "title", "submitEffect"] as const) {
      assert.equal(equipmentSlotFor({ ...item, category: "EQUIPMENT", metadata: { kind } }), kind);
    }
  });

  it("prevents consumables, files and unknown metadata from being equipped", () => {
    assert.equal(equipmentSlotFor({ category: "AVATAR", isConsumable: true, metadata: null }), null);
    assert.equal(equipmentSlotFor({ category: "STUDY_PACK", isConsumable: false, metadata: { kind: "avatarFrame" } }), null);
    assert.equal(equipmentSlotFor({ category: "EQUIPMENT", isConsumable: false, metadata: { kind: "unauthorized" } }), null);
    assert.equal(equipmentSlotFor({ category: "EQUIPMENT", isConsumable: false, metadata: null }), null);
  });

  it("maps only five cosmetic choices to user account fields", () => {
    assert.deepEqual(Object.keys(EQUIPMENT_SLOT_FIELDS).sort(), ["avatar", "avatarFrame", "nameColor", "submitEffect", "title"].sort());
    assert.equal(EQUIPMENT_SLOT_FIELDS.avatar, "equippedAvatarItemId");
    assert.equal(EQUIPMENT_SLOT_FIELDS.avatarFrame, "equippedAvatarFrameId");
    assert.equal(EQUIPMENT_SLOT_FIELDS.nameColor, "equippedNameColorId");
    assert.equal(EQUIPMENT_SLOT_FIELDS.title, "equippedTitleId");
    assert.equal(EQUIPMENT_SLOT_FIELDS.submitEffect, "equippedSubmitEffectId");
    assert.equal(EQUIPMENT_SLOT_LABELS.avatar, "Ảnh đại diện");
  });
});
