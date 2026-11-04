import { prisma } from "@/lib/db";
import { requireUser, handleRouteError, HttpError } from "@/lib/api";
import { NextResponse } from "next/server";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params;
    const payment = await prisma.payment.findFirst({ where: { id, userId: user.id }, select: { id: true, status: true } });
    if (!payment) throw new HttpError(404, "Không tìm thấy giao dịch.");
    return NextResponse.json({ payment }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return handleRouteError(error); }
}
