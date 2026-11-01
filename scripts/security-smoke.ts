/**
 * Integration smoke test against an isolated CI PostgreSQL database and a
 * running Next.js server. Does not use production credentials or real payments.
 */
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const nonce = Math.random().toString(36).slice(2);
const password = "LocalSmokeOnly!2026-X";
const adminEmail = `smoke-admin-${nonce}@example.test`;
const studentEmail = `smoke-student-${nonce}@example.test`;
const cookies = () => new Map<string, string>();

type Jar = Map<string, string>;

function storeCookies(response: Response, jar: Jar) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const list = headers.getSetCookie?.() ?? (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);
  for (const value of list) {
    const first = value.split(";")[0];
    const index = first.indexOf("=");
    if (index > 0) jar.set(first.slice(0, index), first.slice(index + 1));
  }
}
async function request(path: string, init: RequestInit = {}, jar?: Jar) {
  const headers = new Headers(init.headers);
  if (jar?.size) headers.set("cookie", Array.from(jar, ([name, value]) => `${name}=${value}`).join("; "));
  const response = await fetch(new URL(path, base), { ...init, headers, redirect: "manual" });
  if (jar) storeCookies(response, jar);
  return response;
}
async function assertStatus(response: Response, expected: number, operation: string) {
  if (response.status !== expected) {
    const body = (await response.text()).slice(0, 1200);
    assert.fail(`${operation}: expected HTTP ${expected}, got ${response.status}: ${body}`);
  }
}
async function postJson(path: string, body: unknown, jar?: Jar, method = "POST") {
  return request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, jar);
}
async function login(email: string, pass: string) {
  const jar = cookies();
  const tokenResponse = await request("/api/auth/csrf", {}, jar);
  await assertStatus(tokenResponse, 200, "auth csrf");
  const token = (await tokenResponse.json() as { csrfToken: string }).csrfToken;
  assert.ok(token, "missing auth CSRF token");
  const credentials = new URLSearchParams({
    csrfToken: token,
    email,
    password: pass,
    callbackUrl: `${base}/dashboard`,
    json: "true",
  });
  const callback = await request("/api/auth/callback/credentials?json=true", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: credentials.toString(),
  }, jar);
  assert.ok(callback.status >= 200 && callback.status < 400, "credentials callback failed: " + callback.status);
  const sessionResponse = await request("/api/auth/session", {}, jar);
  await assertStatus(sessionResponse, 200, "session");
  const session = await sessionResponse.json() as { user?: { email?: string; role?: string } };
  assert.equal(session.user?.email, email, "login must create authenticated user session");
  return { jar, session };
}
async function run() {
  let adminId: string | undefined;
  let studentId: string | undefined;
  let planId: string | undefined;
  try {
    console.log("SMOKE: public registration and auth with isolated PostgreSQL");
    const bad = await postJson("/api/auth/register", {
      name: "Tester", email: studentEmail, password, role: "TEACHER",
    });
    await assertStatus(bad, 400, "reject self-assigned teacher");

    const good = await postJson("/api/auth/register", {
      name: "Student Tester", email: studentEmail, password,
    });
    await assertStatus(good, 201, "student registration");
    const student = await prisma.user.findUniqueOrThrow({ where: { email: studentEmail } });
    studentId = student.id;
    assert.equal(student.role, "STUDENT");

    const admin = await prisma.user.create({
      data: {
        name: "Admin Tester", email: adminEmail,
        role: "ADMIN", passwordHash: await bcrypt.hash(password, 12),
      },
    });
    adminId = admin.id;
    const plan = await prisma.plan.create({
      data: { name: "Test plan", slug: `smoke-plan-${nonce}`, description: "CI only",
        price: 75000, interval: "MONTH", features: ["Sample"], isActive: true },
    });
    planId = plan.id;

    const anonAdmin = await request("/api/admin/users");
    assert.ok(anonAdmin.status === 401 || anonAdmin.status === 403 || (anonAdmin.status >= 300 && anonAdmin.status < 400),
      "anonymous user must not access admin API");

    const studentAuth = await login(studentEmail, password);
    assert.equal(studentAuth.session.user?.role, "STUDENT");
    const deniedAdmin = await request("/api/admin/users", {}, studentAuth.jar);
    assert.ok(deniedAdmin.status === 403 || (deniedAdmin.status >= 300 && deniedAdmin.status < 400),
      "student must not access admin API");

    console.log("SMOKE: checkout creates pending payment without subscription");
    const checkout = await postJson("/api/payments/checkout", { planId }, studentAuth.jar);
    await assertStatus(checkout, 201, "manual checkout");
    const result = await checkout.json() as { payment?: { id: string; status: string; amount: number } };
    assert.equal(result.payment?.status, "PENDING");
    assert.equal(result.payment?.amount, 75000);
    assert.equal(await prisma.subscription.count({ where: { userId: studentId } }), 0,
      "checkout must not grant subscription before bank reconciliation");

    const adminAuth = await login(adminEmail, password);
    assert.equal(adminAuth.session.user?.role, "ADMIN");
    const adminRead = await request("/api/admin/payments", {}, adminAuth.jar);
    await assertStatus(adminRead, 200, "admin list payments");
    const body = await adminRead.json() as { items: Array<{ user: Record<string, unknown> }> };
    assert.ok(body.items.some((payment) => payment.user && !("passwordHash" in payment.user)),
      "admin response must never expose user password hashes");

    const tamper = await postJson(`/api/admin/users/${studentId}`, { coins: 9999999 }, adminAuth.jar, "PUT");
    await assertStatus(tamper, 400, "reject mass assignment of coins");
    const untouched = await prisma.user.findUniqueOrThrow({ where: { id: studentId } });
    assert.equal(untouched.coins, 0);

    const promote = await postJson(`/api/admin/users/${studentId}`, { role: "TEACHER" }, adminAuth.jar, "PUT");
    await assertStatus(promote, 200, "admin explicit teacher promotion");
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: studentId } })).role, "TEACHER");

    console.log("SMOKE: revoked admin role cannot use old authenticated JWT");
    await prisma.user.update({ where: { id: adminId }, data: { role: "STUDENT" } });
    const revoked = await request("/api/admin/users", {}, adminAuth.jar);
    await assertStatus(revoked, 403, "revoke admin while JWT still has ADMIN");
    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });

    const privateAsset = await request("/uploads/documents/smoke-secret.pdf", {}, studentAuth.jar);
    await assertStatus(privateAsset, 404, "block direct static document access");

    console.log("SMOKE PASSED: register, credentials login, RBAC, checkout, admin fields, JWT revocation, uploads");
  } finally {
    // Completely disposable test database: cleanup even if an assertion fails.
    if (studentId) {
      await prisma.payment.deleteMany({ where: { userId: studentId } });
      await prisma.subscription.deleteMany({ where: { userId: studentId } });
    }
    if (adminId || studentId) {
      await prisma.user.deleteMany({ where: { id: { in: [adminId, studentId].filter((id): id is string => !!id) } } });
    }
    if (planId) await prisma.plan.delete({ where: { id: planId } });
    await prisma.$disconnect();
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
