import { requireAdmin } from "@/lib/api";
import { AdminSupportInbox } from "@/components/admin/support-inbox";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  await requireAdmin();
  return <AdminSupportInbox />;
}
