import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/referral-invites";
import { verifiedInviterFromToken, findEligibleInviter } from "@/lib/referrals";
import { registerSchema } from "@/lib/registration";
import { prisma } from "@/lib/db";
import { rateLimitOperation } from "@/lib/security-throttle";
import { handleRouteError, HttpError, jsonOk, readJson } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const payload = registerSchema.parse(await readJson<unknown>(request));
    await rateLimitOperation(prisma, "register", payload.email, request.headers);
    const existing = await prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) throw new HttpError(409, "Email already exists");

    const inviteCookie = (await cookies()).get(COOKIE_NAME)?.value;
    const invite = verifiedInviterFromToken(inviteCookie);
    const inviter = await findEligibleInviter(invite?.inviterId);
    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        passwordHash,
        role: "STUDENT",
        ...(inviter ? { referredByUserId: inviter.id } : {}),
        profile: { create: { grade: payload.grade, province: payload.province, source: "register" } }
      },
      select: { id: true, email: true, name: true, role: true }
    });

    const response = jsonOk({ user }, 201);
    if (inviteCookie) response.cookies.delete(COOKIE_NAME);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
