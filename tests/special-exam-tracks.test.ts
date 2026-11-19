import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { specialExamTracks, getSpecialExamTrack } from "../src/lib/special-exam-tracks";
import { parseAdminInput } from "../src/lib/admin-input";

describe("THPTQG special exam categories", () => {
  it("has exactly the five supported exam tracks in their expected order", () => {
    assert.deepEqual(specialExamTracks.map((track) => track.label), [
      "HSA", "TSA", "V-ACT", "QDA", "ĐGNL BCA",
    ]);
    assert.equal(new Set(specialExamTracks.map((track) => track.slug)).size, 5);
    assert.equal(new Set(specialExamTracks.map((track) => track.id)).size, 5);
    assert.equal(getSpecialExamTrack("bqa"), undefined);
    assert.equal(getSpecialExamTrack("BQA"), undefined);
  });

  it("accepts canonical IDs and URL slugs, but rejects unknown tracks", () => {
    for (const track of specialExamTracks) {
      assert.deepEqual(getSpecialExamTrack(track.slug), track);
      assert.deepEqual(getSpecialExamTrack(track.id), track);
    }
    assert.equal(getSpecialExamTrack("HSA-other"), undefined);
    assert.equal(getSpecialExamTrack(""), undefined);
  });

  it("accepts an optional admin exam classification without allowing arbitrary values", () => {
    for (const track of specialExamTracks) {
      assert.deepEqual(parseAdminInput("exams", { specialExamTrack: track.id }, "update"), {
        specialExamTrack: track.id,
      });
    }
    assert.deepEqual(parseAdminInput("exams", { specialExamTrack: null }, "update"), {
      specialExamTrack: null,
    });
    assert.throws(() => parseAdminInput("exams", { specialExamTrack: "INVALID" }, "update"));
    assert.throws(() => parseAdminInput("exams", { specialExamTrack: "BQA" }, "update"));
    assert.throws(() => parseAdminInput("exams", { specialExamTrack: { id: "HSA" } }, "update"));
  });
});
