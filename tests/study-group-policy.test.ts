import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canRemoveGroupExam, isShareablePersonalExam } from "../src/lib/study-group-policy";

describe("private study group sharing policy", () => {
  it("only accepts a published personal exam owned by the sharer", () => {
    const exam = { ownerId: "alice", code: "USER-EXAM123", isPublished: true };
    assert.equal(isShareablePersonalExam(exam, "alice"), true);
    assert.equal(isShareablePersonalExam(exam, "bob"), false);
    assert.equal(isShareablePersonalExam({ ...exam, isPublished: false }, "alice"), false);
    assert.equal(isShareablePersonalExam({ ...exam, code: "THPT-EXAM123" }, "alice"), false);
    assert.equal(isShareablePersonalExam({ ...exam, ownerId: null }, "alice"), false);
    assert.equal(isShareablePersonalExam(null, "alice"), false);
  });

  it("permits only the group owner or original sharer to remove a share", () => {
    assert.equal(canRemoveGroupExam("owner", "owner", "alice"), true);
    assert.equal(canRemoveGroupExam("alice", "owner", "alice"), true);
    assert.equal(canRemoveGroupExam("bob", "owner", "alice"), false);
  });
});
