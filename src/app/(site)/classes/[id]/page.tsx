import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Chi tiết lớp học | Ava",
};

export default async function ClassroomDetailPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/classes");
  notFound();
}
