/**
 * Integration smoke test against an isolated CI PostgreSQL database and a
 * running Next.js server. Does not use production credentials or real payments.
 */
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { consumeSecurityThrottle, throttleKey, TooManyRequestsError } from "../src/lib/security-throttle";

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
const adminBase = process.env.SMOKE_ADMIN_BASE_URL ?? "http://127.0.0.1:4000";
async function adminRequest(path: string, init: RequestInit = {}, jar?: Jar) {
  const headers = new Headers(init.headers);
  if (jar?.size) headers.set("cookie", Array.from(jar, ([key, value]) => `${key}=${value}`).join("; "));
  const response = await fetch(new URL(path, adminBase), { ...init, headers, redirect: "manual" });
  if (jar) storeCookies(response, jar);
  return response;
}
async function postAdminForm(path: string, body: Record<string, string>, jar?: Jar, trusted = true) {
  return adminRequest(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(trusted ? { Origin: adminBase } : {}),
    },
    body: new URLSearchParams(body).toString(),
  }, jar);
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
  let subjectId: string | undefined;
  const createdExamIds: string[] = [];
  const uploadedFiles: string[] = [];
  const createdDocumentIds: string[] = [];
  const contactEmail = `smoke-contact-${nonce}@example.test`;
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

    console.log("SMOKE: profile never leaks stored password hashes");
    const profileResponse = await request("/api/profile", {}, studentAuth.jar);
    await assertStatus(profileResponse, 200, "student profile");
    const profileBody = await profileResponse.json() as { profile: Record<string, unknown> };
    assert.equal(profileBody.profile.email, studentEmail);
    assert.ok(!("passwordHash" in profileBody.profile), "never expose a bcrypt password hash");
    assert.ok(!("accounts" in profileBody.profile), "never expose OAuth credentials");

    console.log("SMOKE: PostgreSQL throttle is shared and blocks concurrent attempts");
    const throttleScope = `smoke-bucket-${nonce}`.replace(/[^a-z0-9-]/g, "");
    const throttleSubject = studentEmail;
    const limits = await Promise.allSettled(
      Array.from({ length: 8 }, () => consumeSecurityThrottle(prisma, throttleScope, throttleSubject, {
        limit: 5, windowSeconds: 120,
      })),
    );
    assert.equal(limits.filter((x) => x.status === "fulfilled").length, 5);
    assert.equal(limits.filter((x) => x.status === "rejected" &&
      x.reason instanceof TooManyRequestsError).length, 3);
    assert.equal(await prisma.securityThrottle.count({ where: { key: throttleKey(throttleScope, throttleSubject) } }), 1);

    console.log("SMOKE: contact route returns HTTP 429 after its account quota");
    for (let i = 0; i < 5; i++) {
      const contact = await postJson("/api/contact", {
        name: "Contact Test", email: contactEmail, message: "A valid contact form message from integration tests",
      });
      await assertStatus(contact, i < 4 ? 201 : 429, "contact request throttle");
      if (i === 4) assert.ok(Number(contact.headers.get("retry-after")) > 0, "Retry-After required");
    }

    console.log("SMOKE: upload validates PDF bytes, not just extensions");
    const metadata = {
      title: "Tài liệu smoke kiểm thử", description: "Bản kiểm thử chữ ký tệp PDF bằng PostgreSQL",
      level: "THCS", grade: "Lớp 6", subject: "Toán", type: "FORMULA_HANDBOOK",
    };
    const makeForm = (bytes: Uint8Array) => {
      const form = new FormData();
      for (const [key, value] of Object.entries(metadata)) form.set(key, value);
      const owned = new Uint8Array(bytes.byteLength);
      owned.set(bytes);
      form.set("file", new Blob([owned.buffer as ArrayBuffer], { type: "application/pdf" }), "test.pdf");
      return form;
    };
    const rejectedFile = await request("/api/documents", {
      method: "POST", body: makeForm(new TextEncoder().encode("MZ executable with a PDF filename")),
    }, studentAuth.jar);
    await assertStatus(rejectedFile, 400, "spoofed PDF must be rejected");
    const uploaded = await request("/api/documents", {
      method: "POST", body: makeForm(new TextEncoder().encode("%PDF-1.7\\n1 0 obj\\n<<>>\\nendobj\\n%%EOF\\n")),
    }, studentAuth.jar);
    await assertStatus(uploaded, 201, "valid PDF uploaded for moderation");
    const uploadedResult = await uploaded.json() as { document: { id: string; status: string } };
    assert.equal(uploadedResult.document.status, "PENDING");
    createdDocumentIds.push(uploadedResult.document.id);
    const docRecord = await prisma.document.findUniqueOrThrow({ where: { id: uploadedResult.document.id } });
    uploadedFiles.push(docRecord.storedName);
    const unauthorizedDocument = await request(`/api/documents/${docRecord.id}/file`);
    // The uploader can access their own pending file. Unauthenticated access is always denied.
    assert.ok([401, 302, 307, 308].includes(unauthorizedDocument.status));

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

    console.log("SMOKE: exam detail and discovery are protected against answer/key leaks");
    const subject = await prisma.subject.create({
      data: { slug: `smoke-subject-${nonce}`, name: "Test subject", description: "Integration tests only", family: "THPTQG" },
    });
    subjectId = subject.id;
    const privateExam = await prisma.exam.create({
      data: {
        code: `SEC-PRIVATE-${nonce}`, slug: `smoke-private-${nonce}`,
        title: "Private exam", description: "Only owner and grantees may read",
        family: "THPTQG", type: "PRACTICE", accessLevel: "FREE",
        year: 2026, durationMinutes: 30, subjectId, ownerId: adminId,
        shareMode: "RESTRICTED", shareToken: `secret-${nonce}`,
        isPublished: true, questions: { create: [{
          type: "SINGLE_CHOICE", position: 1, prompt: "Private question?",
          points: 1, correctText: "PRIVATE-ANSWER-SECRET", explanation: "PRIVATE-SOLUTION-SECRET",
          answerOptions: { create: [
            { label: "A", content: "First", isCorrect: true },
            { label: "B", content: "Second", isCorrect: false },
          ] },
        }] },
      },
    });
    createdExamIds.push(privateExam.id);
    const proExam = await prisma.exam.create({
      data: {
        code: `SEC-PRO-${nonce}`, slug: `smoke-pro-${nonce}`,
        title: "Pro exam", description: "Only VIP may read questions",
        family: "THPTQG", type: "MOCK", accessLevel: "PRO",
        year: 2026, durationMinutes: 30, subjectId, shareMode: "PUBLIC", isPublished: true,
        questions: { create: [{ type: "SINGLE_CHOICE", position: 1, prompt: "Pro question?",
          points: 1, correctText: "PRO-SECRET", explanation: "PRO-SOLUTION",
          answerOptions: { create: [{ label: "A", content: "Yes", isCorrect: true },
            { label: "B", content: "No", isCorrect: false }] } }] },
      },
    });
    createdExamIds.push(proExam.id);
    const anonymousExam = await request(`/api/exams/${proExam.id}`);
    await assertStatus(anonymousExam, 401, "anonymous exam detail must require login");
    const deniedPrivate = await request(`/api/exams/${privateExam.id}`, {}, studentAuth.jar);
    await assertStatus(deniedPrivate, 403, "private exam detail without invitation");
    const deniedPro = await request(`/api/exams/${proExam.id}`, {}, studentAuth.jar);
    await assertStatus(deniedPro, 403, "PRO exam without subscription");
    const catalog = await request("/api/exams", {}, studentAuth.jar);
    await assertStatus(catalog, 200, "exam catalog");
    const listed = await catalog.json() as { exams: Array<Record<string, unknown>> };
    assert.ok(!listed.exams.some((exam) => exam.id === privateExam.id), "private exam must not appear in search");
    assert.ok(listed.exams.some((exam) => exam.id === proExam.id), "public PRO exam can be listed without leaking questions");
    assert.ok(!JSON.stringify(listed).includes(`secret-${nonce}`), "do not leak sharing tokens");
    await prisma.examAccessGrant.create({ data: { examId: privateExam.id, userId: studentId } });
    const grantedPrivate = await request(`/api/exams/${privateExam.id}`, {}, studentAuth.jar);
    await assertStatus(grantedPrivate, 200, "private exam access granted by owner");
    const grantedBody = await grantedPrivate.json() as { exam: Record<string, unknown> };
    assert.ok(!("shareToken" in grantedBody.exam) && !("sharePasswordHash" in grantedBody.exam));
    assert.ok(!JSON.stringify(grantedBody).includes("PRIVATE-ANSWER-SECRET"));
    assert.ok(!JSON.stringify(grantedBody).includes("PRIVATE-SOLUTION-SECRET"));
    assert.ok(!JSON.stringify(grantedBody).includes('"isCorrect"'));
    const ownerPrivate = await request(`/api/exams/${privateExam.id}`, {}, adminAuth.jar);
    await assertStatus(ownerPrivate, 200, "exam owner access");
    const adminRead = await request("/api/admin/payments", {}, adminAuth.jar);
    await assertStatus(adminRead, 200, "admin list payments");
    const body = await adminRead.json() as { items: Array<{ user: Record<string, unknown> }> };
    assert.ok(body.items.some((payment) => payment.user && !("passwordHash" in payment.user)),
      "admin response must never expose user password hashes");

    console.log("SMOKE: only atomic reconciliation may mark payment PAID");
    const createPaid = await postJson("/api/admin/payments", {
      userId: studentId, planId, amount: 75000, status: "PAID",
      provider: "manual-bank-transfer", reference: `BAD-PAID-${nonce}`,
    }, adminAuth.jar);
    await assertStatus(createPaid, 400, "reject direct paid-payment creation");
    const paid = await postJson(`/api/admin/payments/${result.payment?.id}`, { status: "PAID" }, adminAuth.jar, "PUT");
    await assertStatus(paid, 200, "atomic VIP payment settlement");
    const settled = await prisma.payment.findUniqueOrThrow({ where: { id: result.payment!.id } });
    assert.equal(settled.status, "PAID");
    const marker = settled.metadata as Record<string, unknown> | null;
    assert.ok(marker && typeof marker.vipSubscriptionId === "string", "must save linked VIP subscription ID");
    assert.equal(await prisma.subscription.count({ where: { userId: studentId } }), 1,
      "paid payment must activate exactly one VIP subscription");
    const paidAgain = await postJson(`/api/admin/payments/${result.payment?.id}`, { status: "PAID" }, adminAuth.jar, "PUT");
    await assertStatus(paidAgain, 200, "repeat payment confirmation must be idempotent");
    assert.equal(await prisma.subscription.count({ where: { userId: studentId } }), 1,
      "repeated payment confirmation must not extend VIP");
    console.log("SMOKE: standalone Admin also uses atomic VIP confirmation with CSRF protection");
    const adminJar = cookies();
    const adminLogin = await postAdminForm("/login", { email: adminEmail, password }, adminJar);
    await assertStatus(adminLogin, 303, "standalone Admin login");
    assert.ok(adminJar.has("ava_admin_session"), "standalone session cookie was not set");
    const secondCheckout = await postJson("/api/payments/checkout", { planId }, studentAuth.jar);
    await assertStatus(secondCheckout, 201, "second pending VIP checkout");
    const secondData = await secondCheckout.json() as { payment: { id: string } };
    const csrfBlocked = await postAdminForm(
      `/payments/${secondData.payment.id}/status`, { status: "PAID" }, adminJar, false,
    );
    await assertStatus(csrfBlocked, 403, "reject cross-origin/missing-Origin bank approval");
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: secondData.payment.id } })).status, "PENDING");
    const approveSecond = await postAdminForm(
      `/payments/${secondData.payment.id}/status`, { status: "PAID" }, adminJar,
    );
    await assertStatus(approveSecond, 303, "standalone Admin manual bank approval");
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: secondData.payment.id } })).status, "PAID");
    assert.equal(await prisma.subscription.count({ where: { userId: studentId } }), 2);
    const approveSecondAgain = await postAdminForm(
      `/payments/${secondData.payment.id}/status`, { status: "PAID" }, adminJar,
    );
    await assertStatus(approveSecondAgain, 303, "standalone repeated payment verification");
    assert.equal(await prisma.subscription.count({ where: { userId: studentId } }), 2,
      "repeated confirmation on standalone Admin must not create a third subscription");

    const reversal = await postJson(`/api/admin/payments/${result.payment?.id}`, { status: "FAILED" }, adminAuth.jar, "PUT");
    await assertStatus(reversal, 409, "paid payment must not be reverted without reconciliation");
    const unlockedPro = await request(`/api/exams/${proExam.id}`, {}, studentAuth.jar);
    await assertStatus(unlockedPro, 200, "VIP subscription unlocks PRO exam");
    const proBody = await unlockedPro.json();
    assert.ok(!JSON.stringify(proBody).includes("PRO-SECRET"), "never send PRO answer key");

    const tamper = await postJson(`/api/admin/users/${studentId}`, { coins: 9999999 }, adminAuth.jar, "PUT");
    await assertStatus(tamper, 400, "reject mass assignment of coins");
    const untouched = await prisma.user.findUniqueOrThrow({ where: { id: studentId } });
    assert.equal(untouched.coins, 0);

    const promote = await postJson(`/api/admin/users/${studentId}`, { role: "TEACHER" }, adminAuth.jar, "PUT");
    await assertStatus(promote, 200, "admin explicit teacher promotion");
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: studentId } })).role, "TEACHER");

    console.log("SMOKE: revoked teacher and admin lose Server Component access too");
    const teacherAuth = await login(studentEmail, password);
    assert.equal(teacherAuth.session.user?.role, "TEACHER");
    const activeTeacher = await request("/teacher", {}, teacherAuth.jar);
    await assertStatus(activeTeacher, 200, "teacher dashboard before revocation");
    await prisma.user.update({ where: { id: studentId }, data: { role: "STUDENT" } });
    const staleTeacher = await request("/teacher", {}, teacherAuth.jar);
    assert.ok(staleTeacher.status === 307 || staleTeacher.status === 308,
      "teacher dashboard must redirect after database role revocation");

    console.log("SMOKE: revoked admin role cannot use old authenticated JWT");
    await prisma.user.update({ where: { id: adminId }, data: { role: "STUDENT" } });
    const revoked = await request("/api/admin/users", {}, adminAuth.jar);
    await assertStatus(revoked, 403, "revoke admin while JWT still has ADMIN");
    const revokedAdminPage = await request("/admin", {}, adminAuth.jar);
    assert.ok(revokedAdminPage.status === 307 || revokedAdminPage.status === 308,
      "server-rendered admin page must reject revoked JWT role");
    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });

    const privateAsset = await request("/uploads/documents/smoke-secret.pdf", {}, studentAuth.jar);
    await assertStatus(privateAsset, 404, "block direct static document access");

    console.log("SMOKE PASSED: register, credentials login, RBAC, checkout, admin fields, JWT revocation, uploads");
  } finally {
    // Completely disposable test database: cleanup even if an assertion fails.
    if (createdDocumentIds.length) await prisma.document.deleteMany({ where: { id: { in: createdDocumentIds } } });
    for (const name of uploadedFiles) await unlink(join(process.cwd(), "public", "uploads", "documents", name)).catch(() => undefined);
    await prisma.leadMessage.deleteMany({ where: { email: contactEmail } });
    if (createdExamIds.length) {
      await prisma.exam.deleteMany({ where: { id: { in: createdExamIds } } });
    }
    if (subjectId) await prisma.subject.delete({ where: { id: subjectId } });
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
