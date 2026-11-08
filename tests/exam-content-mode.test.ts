import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentModeFromLegacy, typeForContentMode } from "../src/lib/exam-content-mode";

describe("exam content categories", () => {
  it("honours explicit legacy Admin category over old type", () => {
    assert.equal(contentModeFromLegacy("MOCK", "topics"), "TOPIC");
    assert.equal(contentModeFromLegacy("PRACTICE", "exams"), "EXAM");
    assert.equal(contentModeFromLegacy("PRACTICE", "theory"), "TOPIC");
  });
  it("maps old exam types predictably without deleting anything", () => {
    assert.equal(contentModeFromLegacy("PRACTICE", null), "TOPIC");
    assert.equal(contentModeFromLegacy("MOCK", null), "EXAM");
    assert.equal(contentModeFromLegacy("PREDICTION", null), "EXAM");
  });
  it("maps the two Admin labels to compatible internal types", () => {
    assert.equal(typeForContentMode("TOPIC", "MOCK"), "PRACTICE");
    assert.equal(typeForContentMode("EXAM", "PRACTICE"), "MOCK");
    assert.equal(typeForContentMode("EXAM", "PREDICTION"), "PREDICTION");
  });
});
