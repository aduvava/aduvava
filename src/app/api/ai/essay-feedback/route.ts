import { handleRouteError, HttpError, requireUser } from "@/lib/api";

export async function POST() {
  try {
    await requireUser();
    throw new HttpError(503, "Chấm bài AI chưa được cấu hình. Bài tự luận sẽ chờ giáo viên chấm.");
  } catch (error) {
    return handleRouteError(error);
  }
}
