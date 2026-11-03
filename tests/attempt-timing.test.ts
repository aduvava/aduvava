import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  attemptDeadlineMs, helperExtraTimeSeconds, isAttemptExpired,
  remainingAttemptSeconds, MAX_EXTRA_TIME_SECONDS,
} from "../src/lib/attempt-timing";

const startedAt = new Date("2026-11-03T03:00:00.000Z");
const attempt = { startedAt, extraTimeSeconds: 0, exam: { durationMinutes: 40 } };

describe("server-authoritative exam deadline", () => {
  it("stops accepting answers at the exact server-side deadline", () => {
    const deadline = new Date("2026-11-03T03:40:00.000Z");
    assert.equal(attemptDeadlineMs(attempt), deadline.getTime());
    assert.equal(isAttemptExpired(attempt, new Date(deadline.getTime() - 1)), false);
    assert.equal(isAttemptExpired(attempt, deadline), true);
    assert.equal(remainingAttemptSeconds(attempt, deadline), 0);
    assert.equal(remainingAttemptSeconds(attempt, new Date(deadline.getTime() - 1)), 1);
  });

  it("honors only the extra time stored by the server and caps the extension", () => {
    const extended = { ...attempt, extraTimeSeconds: 300 };
    assert.equal(isAttemptExpired(extended, new Date("2026-11-03T03:41:00Z")), false);
    assert.equal(isAttemptExpired(extended, new Date("2026-11-03T03:45:00Z")), true);
    assert.equal(attemptDeadlineMs({ ...attempt, extraTimeSeconds: 999999 }),
      attemptDeadlineMs({ ...attempt, extraTimeSeconds: MAX_EXTRA_TIME_SECONDS }));
  });

  it("bounds helper time grants and ignores bad item metadata", () => {
    assert.equal(helperExtraTimeSeconds({ minutes: 5 }), 300);
    assert.equal(helperExtraTimeSeconds({ minutes: 9999 }), 1200);
    assert.equal(helperExtraTimeSeconds({ minutes: -100 }), 60);
    assert.equal(helperExtraTimeSeconds({ minutes: "999" }), 300);
  });
});
