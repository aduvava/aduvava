import { prisma } from "@/lib/db";
import { HttpError, handleRouteError, requireUser } from "@/lib/api";
import { isStoreFileInfo, readStoreAsset } from "@/lib/store-upload-storage";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const item = await prisma.storeItem.findUnique({
      where: { id },
      select: { metadata: true, name: true },
    });
    if (!item) throw new HttpError(404, "Không tìm thấy vật phẩm.");
    const info = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? (item.metadata as Record<string, unknown>).downloadFile
      : null;
    if (!isStoreFileInfo(info)) throw new HttpError(404, "Vật phẩm chưa có tệp đính kèm.");
    if (user.role !== "ADMIN") {
      const purchase = await prisma.storePurchase.findFirst({
        where: { itemId: id, userId: user.id },
        select: { id: true },
      });
      if (!purchase) throw new HttpError(403, "Bạn cần mua vật phẩm trước khi tải tài liệu.");
    }
    let file: Buffer;
    try {
      file = await readStoreAsset(info.storedName, 15 * 1024 * 1024);
    } catch {
      throw new HttpError(404, "Tệp sản phẩm không còn tồn tại.");
    }
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": info.mimeType,
        "Content-Length": String(file.length),
        "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(info.originalName),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
