import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClassroomHub } from "@/components/classroom-hub";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Lớp học | Ava",
  description: "Quản lý lớp học, bài tập và kết nối với giáo viên.",
};

export default async function ClassesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/classes");

  return <ClassroomHub />;
}
