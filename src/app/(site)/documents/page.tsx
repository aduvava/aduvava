import { redirect } from "next/navigation";
import { DocumentHub } from "@/components/document-hub";
import { getCurrentUser } from "@/lib/auth";

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/documents");

  return <DocumentHub />;
}
