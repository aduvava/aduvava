import { requireAdmin } from "@/lib/api";
import { AdminComplianceInbox } from "@/components/admin/compliance-inbox";

export const dynamic = "force-dynamic";

export default async function AdminRequestsPage() {
  await requireAdmin();
  return <AdminComplianceInbox />;
}
