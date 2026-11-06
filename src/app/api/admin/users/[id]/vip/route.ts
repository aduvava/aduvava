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
    const host = request.headers.get("host");
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    // Reverse proxies may produce an internal request.url (localhost:3000)
    // even when the user's browser talks to educhi.xyz. Compare the origin
    // against the actual forwarded/public Host too, rather than trusting
    // the internal URL alone. Never allow http origins outside localhost.
    const originUrl = origin ? new URL(origin) : null;
    const allowedHosts = [host, forwardedHost, new URL(request.url).host].filter(Boolean);
    const localDevelopment = originUrl && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(originUrl.host);
    if (!originUrl || !allowedHosts.includes(originUrl.host) ||
      (originUrl.protocol !== "https:" && !(localDevelopment && originUrl.protocol === "http:"))) {
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
