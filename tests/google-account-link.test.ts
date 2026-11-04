import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { googleIdentityMatchesExistingAccount, isVerifiedGoogleIdentity } from "../src/lib/google-account-link";

describe("safe linking of Google to an existing Eduva account", () => {
  it("accepts only Google-verified email identities", () => {
    assert.equal(isVerifiedGoogleIdentity({ email: "a@gmail.com", email_verified: true }), true);
    assert.equal(isVerifiedGoogleIdentity({ email: "a@gmail.com", email_verified: false }), false);
    assert.equal(isVerifiedGoogleIdentity({ email: "a@gmail.com" }), false);
    assert.equal(isVerifiedGoogleIdentity(null), false);
    assert.equal(isVerifiedGoogleIdentity({ email: "  ", email_verified: true }), false);
  });

  it("requires a verified email to match the signed-in Eduva user", () => {
    assert.equal(googleIdentityMatchesExistingAccount(
      { email: " USER@gmail.com ", email_verified: true }, "user@gmail.com",
    ), true);
    assert.equal(googleIdentityMatchesExistingAccount(
      { email: "other@gmail.com", email_verified: true }, "user@gmail.com",
    ), false);
    assert.equal(googleIdentityMatchesExistingAccount(
      { email: "user@gmail.com", email_verified: false }, "user@gmail.com",
    ), false);
  });

  it("refuses a profile with an unverified email even if it matches textually", () => {
    assert.equal(googleIdentityMatchesExistingAccount(
      { email: "student@example.com", email_verified: "true" }, "student@example.com",
    ), false);
  });
});
