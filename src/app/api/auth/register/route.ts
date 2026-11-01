import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/registration";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const payload = registerSchema.parse(await readJson<unknown>(request));
    const existing = await prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) throw new HttpError(409, "Email already exists");

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        passwordHash,
        role: "STUDENT",
        profile: { create: { grade: payload.grade, province: payload.province, source: "register" } }
      },
      select: { id: true, email: true, name: true, role: true }
    });

    return jsonOk({ user }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
