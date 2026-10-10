import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClassroomDetail } from "@/components/classroom-detail";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Chi tiết lớp học | Ava",
};

export default async function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/classes");
  const { id } = await params;

  return (
    <ClassroomDetail
      classroomId={id}
      currentUserName={user.name ?? "Học sinh Ava"}
      currentUserRole={user.role}
    />
  );
}
