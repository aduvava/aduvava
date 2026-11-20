import assert from "node:assert/strict";
import test from "node:test";
import {
  communityReportOptions, displayCommunityMember, initialsOfDisplayName,
  optionLabel, privacyRequestOptions,
} from "../src/lib/compliance-requests";

test("community API displays student pseudonyms instead of names", () => {
  assert.equal(displayCommunityMember({ id: "student-id-123456", role: "STUDENT" }), "Học viên #123456");
  assert.equal(displayCommunityMember({ id: "teacher-id", role: "TEACHER" }), "Thành viên #HER-ID");
  assert.equal(displayCommunityMember({ id: "admin-id", role: "ADMIN" }), "Quản trị Educhi");
  assert.equal(displayCommunityMember(null), "Thành viên Educhi");
});

test("community initials derive from pseudonym, not real name", () => {
  assert.equal(initialsOfDisplayName("Học viên #123456"), "HS");
  assert.equal(initialsOfDisplayName("Thành viên #123456"), "TV");
});

test("privacy and report options use a strict allow-list", () => {
  assert.equal(optionLabel(privacyRequestOptions, "ACCOUNT_DELETION"), "Yêu cầu xóa tài khoản");
  assert.equal(optionLabel(communityReportOptions, "CHILD_SAFETY"), "Nội dung gây nguy hiểm cho trẻ em");
  assert.equal(optionLabel(privacyRequestOptions, "UNEXPECTED"), null);
});
