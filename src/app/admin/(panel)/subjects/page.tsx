import { redirect } from "next/navigation";

// The separate subject-management UI is retired. Subject records are kept
// intact because exams, theory chapters, catalogues and grade filters use them.
// Redirect saved admin bookmarks instead of deleting a route used by old links.
export default function AdminSubjectsPage() {
  redirect("/admin/exams");
}
