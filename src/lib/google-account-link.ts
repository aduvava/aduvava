// OAuth must never claim an existing account solely because the emails match.
// Only verified Google profiles may be used, and an existing logged-in Eduva
// account can link Google only when both addresses agree.
export type GoogleIdentity = {
  email?: unknown;
  email_verified?: unknown;
};

export function isVerifiedGoogleIdentity(profile: GoogleIdentity | null | undefined): boolean {
  return Boolean(
    profile &&
    profile.email_verified === true &&
    typeof profile.email === "string" &&
    profile.email.trim().length > 0,
  );
}

export function googleIdentityMatchesExistingAccount(
  profile: GoogleIdentity | null | undefined,
  currentEmail: string,
): boolean {
  return isVerifiedGoogleIdentity(profile) &&
    String(profile?.email).trim().toLowerCase() === currentEmail.trim().toLowerCase();
}
