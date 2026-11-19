import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ReviewNotebook } from "@/components/review-notebook";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/so-loi-sai");
  return <ReviewNotebook />;
}
