/** The stored role is the highest entitlement. The active role is a mode.
 * A teacher can also use the student experience without losing any data.
 * A cookie never grants permission that the stored entitlement lacks.
 */
export type ActiveRole = "STUDENT" | "TEACHER" | "ADMIN";

export function resolveActiveRole(
  storedRole: ActiveRole | null | undefined,
  requestedRole: string | null | undefined,
): ActiveRole {
  if (storedRole === "ADMIN") {
    if (requestedRole === "TEACHER" || requestedRole === "STUDENT") return requestedRole;
    return "ADMIN";
  }
  if (storedRole === "TEACHER") {
    return requestedRole === "STUDENT" ? "STUDENT" : "TEACHER";
  }
  return "STUDENT";
}
