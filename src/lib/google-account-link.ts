// Email linking requires an authoritative Google identity, not just matching text.
// Explicit linking additionally requires an existing authenticated Eduva session.
export type GoogleIdentity = {
  email?: unknown;
  email_verified?: unknown;
  hd?: unknown;
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

// Google is authoritative for Gmail and verified Workspace domains. For an
// external mailbox, email_verified alone can refer to ownership years ago.
export function canAutomaticallyLinkGoogle(profile: GoogleIdentity | null | undefined): boolean {
  if (!isVerifiedGoogleIdentity(profile)) return false;
  return String(profile?.email).trim().toLowerCase().endsWith("@gmail.com") ||
    (typeof profile?.hd === "string" && profile.hd.trim().length > 0);
}
