import assert from "node:assert/strict";
import test from "node:test";
import {
  communityReportOptions, displayCommunityMember, initialsOfDisplayName,
  optionLabel, privacyRequestOptions,
} from "../src/lib/compliance-requests";

test("community and ranking display profile names for all members", () => {
  assert.equal(displayCommunityMember({ name: "Nguyễn Văn An" }), "Nguyễn Văn An");
  assert.equal(displayCommunityMember({ name: "  Trần Thị Bình  " }), "Trần Thị Bình");
  assert.equal(displayCommunityMember({ name: "" }), "Thành viên Educhi");
  assert.equal(displayCommunityMember(null), "Thành viên Educhi");
});

test("avatar initials use displayed profile names", () => {
  assert.equal(initialsOfDisplayName("Nguyễn Văn An"), "VA");
  assert.equal(initialsOfDisplayName("Trần Thị Bình"), "TB");
});

test("privacy and report options use a strict allow-list", () => {
  assert.equal(optionLabel(privacyRequestOptions, "ACCOUNT_DELETION"), "Yêu cầu xóa tài khoản");
  assert.equal(optionLabel(communityReportOptions, "CHILD_SAFETY"), "Nội dung gây nguy hiểm cho trẻ em");
  assert.equal(optionLabel(privacyRequestOptions, "UNEXPECTED"), null);
});
