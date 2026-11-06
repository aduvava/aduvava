import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, handleRouteError, jsonOk, readJson, requireAdmin } from "@/lib/api";
import { grantAdminVip } from "@/lib/admin-vip-grant";

export const runtime = "nodejs";

const grantSchema = z.object({
  requestId: z.string().uuid(),
  planId: z.string().trim().min(1).max(200),
  days: z.number().int().min(1).max(365),
  note: z.string().trim().min(4).max(250),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Browser-only, same-origin administrative action; reject cross-origin
    // form submissions even if admin cookies are present.
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
      throw new HttpError(403, "Yêu cầu cấp VIP phải xuất phát từ trang quản trị Educhi.");
    }
    const admin = await requireAdmin();
    const { id } = await params;
    const body = grantSchema.parse(await readJson<unknown>(request));
    const result = await grantAdminVip(prisma, { ...body, userId: id, adminId: admin.id });
    return jsonOk(result, result.activated ? 201 : 200);
  } catch (error) {
    return handleRouteError(error);
  }
}
