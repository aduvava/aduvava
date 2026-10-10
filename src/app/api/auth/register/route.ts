import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson } from "@/lib/api";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  grade: z.string().optional(),
  province: z.string().optional(),
  role: z.enum(["STUDENT", "TEACHER"]).default("STUDENT")
});

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
        role: payload.role,
        profile: { create: { grade: payload.grade, province: payload.province, source: "register" } }
      },
      select: { id: true, email: true, name: true, role: true }
    });

    return jsonOk({ user }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
