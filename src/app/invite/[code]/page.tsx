import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Backwards compatibility for previously shared registration invitation URLs.
// All referrals now lead to the optional-code VIP checkout for any user.
export default async function LegacyInvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect("/r/" + encodeURIComponent(code));
}
