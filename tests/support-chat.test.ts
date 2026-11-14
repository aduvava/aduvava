import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSupportReply, supportQuickQuestions } from "../src/lib/support-chat";

describe("Educhi automated support chat", () => {
  it("replies to a simple greeting instead of ignoring the send action", () => {
    assert.match(getSupportReply("Hi"), /Chào bạn!/);
  });
  it("recognizes Vietnamese questions with accents", () => {
    assert.match(getSupportReply("Em đã chuyển khoản VIP"), /biên lai/);
    assert.match(getSupportReply("Làm đề thi như thế nào?"), /Đề thi/);
    assert.match(getSupportReply("Đổi ảnh đại diện"), /Kho đồ/);
  });
  it("does not pretend to be a human operator for unknown questions", () => {
    assert.match(getSupportReply("lỗi lạ"), /chưa phải nhân viên trực tuyến/);
  });
  it("has quick question suggestions that all produce useful answers", () => {
    assert.equal(supportQuickQuestions.length, 3);
    for (const question of supportQuickQuestions) assert.ok(getSupportReply(question).length > 50);
  });
});
