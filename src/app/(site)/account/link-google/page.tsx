import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safePostLoginPath } from "@/lib/onboarding";

/** Verified Google sign-in no longer needs a separate manual email-linking step. */
export default async function LinkGooglePage({ searchParams }: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const fallback = user.role === "TEACHER" ? "/teacher" : user.role === "ADMIN" ? "/admin" : "/dashboard";
  redirect("/auth/continue?callbackUrl=" + encodeURIComponent(safePostLoginPath(params.callbackUrl, fallback)));
}
