import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { PaymentTransitionError } from "@/lib/payment-transition";
import { TooManyRequestsError } from "@/lib/security-throttle";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON payload");
  }
}

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, "Authentication required");
  // Enforce account existence and current roles, rather than trusting stale JWT claims.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, role: true },
  });
  if (!user) throw new HttpError(401, "Authentication required");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new HttpError(403, "Admin access required");
  return user;
}

export function handleRouteError(error: unknown) {
  if (error instanceof TooManyRequestsError) {
    return NextResponse.json({ error: error.message }, {
      status: 429,
      headers: { "Retry-After": String(error.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  }
  if (error instanceof HttpError || error instanceof PaymentTransitionError) return jsonError(error.message, error.status);
  if (error instanceof ZodError) return jsonError("Invalid request payload", 400);
  console.error(error);
  return jsonError("Unexpected server error", 500);
}
