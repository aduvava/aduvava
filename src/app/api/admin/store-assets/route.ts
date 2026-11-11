import { HttpError, handleRouteError, jsonOk, requireAdmin } from "@/lib/api";
import { storeUploadedAsset } from "@/lib/store-upload-storage";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 16 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireAdmin();
    if (!request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data")) {
      throw new HttpError(415, "Cần tải tệp bằng biểu mẫu.");
    }
    const length = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(length) || length > MAX_REQUEST_BYTES) throw new HttpError(413, "Tệp quá lớn.");
    const form = await request.formData();
    const kind = form.get("kind");
    const file = form.get("file");
    if (kind !== "image" && kind !== "file") throw new HttpError(400, "Loại tệp không hợp lệ.");
    if (!(file instanceof File) || !file.size) throw new HttpError(400, "Vui lòng chọn tệp từ máy.");
    if (file.size > (kind === "image" ? 5 : 15) * 1024 * 1024) throw new HttpError(413, "Tệp quá lớn.");
    const uploaded = await storeUploadedAsset(file, kind);
    return jsonOk({ asset: uploaded }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
