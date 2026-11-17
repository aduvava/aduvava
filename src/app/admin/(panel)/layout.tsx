import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserEntitlement } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { hasAdminEntitlement } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  // Protect all admin UI pages, including those without individual checks.
  const user = await getCurrentUserEntitlement();
  if (!user) redirect("/admin/login");
  if (!hasAdminEntitlement(user.role)) redirect("/dashboard");
  return <AdminShell user={{ name: user.name, email: user.email }}>{children}</AdminShell>;
}
