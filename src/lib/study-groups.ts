import { randomInt } from "node:crypto";
import { HttpError } from "@/lib/api";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateStudyGroupCode() {
  return Array.from({ length: 10 }, () => INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)]).join("");
}

export function assertStudyGroupOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigin = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).origin
    : new URL(request.url).origin;
  if (!origin || origin !== allowedOrigin) {
    throw new HttpError(403, "Yêu cầu không cùng nguồn với Educhi.");
  }
}
