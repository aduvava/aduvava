#!/usr/bin/env node
"use strict";

// Browser smoke exercises real Chromium and a throwaway PostgreSQL database.
// Hard fail if invoked against any real deployment or non-disposable database.
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const { chromium } = require("playwright");

const base = process.env.BROWSER_SMOKE_URL || "http://127.0.0.1:3000";
const dbUrl = process.env.DATABASE_URL || "";
if (process.env.BROWSER_SMOKE_CI_ONLY !== "yes" ||
    !/^http:\/\/127\.0\.0\.1:3000$/.test(base) ||
    !dbUrl.includes("/eduva_browser_ci")) {
  console.error("Refusing browser smoke outside isolated localhost CI database.");
  process.exit(2);
}

async function main() {
  const email = "browser-smoke-" + Date.now() + "@example.test";
  const password = "BrowserSmokeCI-Only-2026!";
  const prisma = new PrismaClient();
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await desktop.newPage();

    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /Luyện Đề Thông Minh/i }).waitFor({ timeout: 30000 });

    // Server authorization should protect logged-in pages in a real browser.
    await page.goto(base + "/dashboard");
    await page.waitForURL(/\/login\?/, { timeout: 15000 });

    await page.goto(base + "/register");
    await page.getByRole("heading", { name: "Tạo tài khoản học sinh" }).waitFor();
    // Google remains available as an alternative registration method.
    assert.equal(await page.getByRole("button", { name: "Đăng ký nhanh bằng Google" }).isDisabled(), true);
    await page.locator('input[name="name"]').fill("Browser Tester");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('select[name="grade"]').selectOption({ index: 1 });
    await page.locator('select[name="province"]').selectOption({ index: 1 });
    await page.getByRole("button", { name: "TẠO TÀI KHOẢN" }).click();
    await page.waitForURL(/\/onboarding(?:\?|$)/, { timeout: 45000 });

    const account = await prisma.user.findUniqueOrThrow({ where: { email } });
    assert.equal(account.role, "STUDENT", "browser-created accounts must be STUDENT");

    // Completing the post-authentication profile is required before dashboard access.
    await page.goto(base + "/dashboard");
    await page.waitForURL(/\/onboarding(?:\?|$)/, { timeout: 15000 });
    await page.locator('input[name="school"]').fill("THPT Nguyễn Trãi");
    const profileResponsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/profile" && response.request().method() === "POST",
      { timeout: 15000 },
    );
    await page.getByRole("button", { name: /HOÀN TẤT.*TIẾP TỤC/ }).click();
    const profileResponse = await profileResponsePromise;
    const postedProfile = profileResponse.request().postDataJSON();
    assert.equal(postedProfile.school, "THPT Nguyễn Trãi", "browser must post the entered school");
    assert.equal(profileResponse.status(), 200, "onboarding API must save profile successfully");
    await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15000 });
    const savedProfile = await prisma.studentProfile.findUniqueOrThrow({ where: { userId: account.id } });
    assert.equal(savedProfile.school, "THPT Nguyễn Trãi", "onboarding must persist the school before redirect");
    assert.ok(savedProfile.grade && savedProfile.province, "onboarding must persist grade and province");

    const sessionResult = await page.request.get(base + "/api/auth/session");
    assert.equal(sessionResult.status(), 200);
    const session = await sessionResult.json();
    assert.equal(session.user?.email, email);

    await page.goto(base + "/dashboard", { waitUntil: "domcontentloaded" });
    assert.equal(new URL(page.url()).pathname, "/dashboard", "completed students should not be sent back to onboarding");

    // Authenticated users can reach the restored grade/subject selector from the bottom bar.
    await page.setViewportSize({ width: 390, height: 844 });
    const studentTabs = page.getByRole("navigation", { name: "Điều hướng chính trên điện thoại" });
    await studentTabs.getByRole("link", { name: "Môn học" }).click();
    await page.waitForURL(/#mon-hoc$/);
    await page.getByRole("button", { name: "Trung học phổ thông" }).click();
    await page.getByRole("button", { name: "Lớp 12" }).click();
    assert.equal(await page.locator("#mon-hoc").count(), 1, "grade and subject section should remain on dashboard");
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto(base + "/teacher");
    await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15000 });
    await page.goto(base + "/admin");
    await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15000 });
    await desktop.close();

    // Existing accounts log in again without re-entering a completed profile.
    const linkContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const linkPage = await linkContext.newPage();
    await linkPage.goto(base + "/login?role=student&callbackUrl=%2Fdashboard");
    await linkPage.locator('input[name="email"]').fill(email);
    await linkPage.locator('input[name="password"]').fill(password);
    await linkPage.getByRole("button", { name: "ĐĂNG NHẬP", exact: true }).click();
    await linkPage.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 20000 });
    const sameUser = await prisma.user.findUniqueOrThrow({ where: { email } });
    assert.equal(sameUser.id, account.id, "existing Educhi account ID must be preserved");

    // A student can opt into teaching after authenticating, retaining the same account.
    await linkPage.goto(base + "/auth/select-role?role=teacher&callbackUrl=/teacher");
    await linkPage.waitForURL(/\/teacher(?:\?|$)/, { timeout: 20000 });
    const teacherAccount = await prisma.user.findUniqueOrThrow({ where: { email } });
    assert.equal(teacherAccount.id, account.id, "changing modes cannot create a second account");
    assert.equal(teacherAccount.role, "TEACHER", "teacher mode opt-in persists eligibility");

    await linkPage.goto(base + "/auth/select-role?role=student&callbackUrl=/dashboard");
    await linkPage.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 20000 });
    const studentSession = await (await linkPage.request.get(base + "/api/auth/session")).json();
    assert.equal(studentSession.user?.role, "STUDENT", "student mode must be active even for a teacher");

    // Selecting an admin mode cannot grant admin to a student/teacher.
    await linkPage.goto(base + "/auth/select-role?role=admin&callbackUrl=/admin");
    await linkPage.waitForURL(/\/login\?role=admin/, { timeout: 15000 });
    await linkContext.close();

    // Test the redesigned Admin editor against a disposable database and real
    // production build. No requests here reach an actual bank or public site.
    await prisma.user.update({ where: { id: account.id }, data: { role: "ADMIN" } });
    const adminContext = await browser.newContext({ viewport: { width: 1366, height: 850 } });
    const adminPage = await adminContext.newPage();
    await adminPage.goto(base + "/login?role=admin&callbackUrl=%2Fadmin");
    await adminPage.locator('input[name="email"]').fill(email);
    await adminPage.locator('input[name="password"]').fill(password);
    await adminPage.getByRole("button", { name: "ĐĂNG NHẬP", exact: true }).click();
    await adminPage.waitForURL(/\/admin(?:\?|$)/, { timeout: 20000 });

    const unique = Date.now().toString(36);
    const subjectResponse = await adminPage.request.post(base + "/api/admin/subjects", { data: {
      slug: "ci-theory-" + unique, name: "Môn kiểm thử " + unique, description: "Chỉ cho môi trường CI",
      family: "THPTQG", icon: "book-open", color: "#f97316",
    } });
    assert.equal(subjectResponse.status(), 201, "admin creates a subject");
    const subjectId = (await subjectResponse.json()).item.id;
    const chapterResponse = await adminPage.request.post(base + "/api/admin/theory-chapters", { data: {
      subjectId, educationLevel: "THCS", grade: "Lớp 6",
      slug: "lop-6-chuong-ci-" + unique, title: "Chương thực hành CI", description: "Chương mẫu",
      position: 1, isPublished: true,
    } });
    assert.equal(chapterResponse.status(), 201, "admin creates a chapter");
    const chapterId = (await chapterResponse.json()).item.id;
    await adminPage.goto(base + "/admin/theory-chapters");
    await adminPage.getByRole("heading", { name: "Chương lý thuyết" }).waitFor();
    assert.equal(await adminPage.getByText("JSON editor").count(), 0, "chapter UI hides JSON editor");

    const pdfBytes = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");
    const lessonResponse = await adminPage.request.post(base + "/api/admin/theory-lessons/manage", {
      multipart: {
        chapterId, title: "Bài có PDF", summary: "Tệp kiểm thử nội bộ", content: "",
        position: "1", accessLevel: "FREE", isPublished: "true", removeFile: "false", lessonId: "",
        file: { name: "lesson.pdf", mimeType: "application/pdf", buffer: pdfBytes },
      },
    });
    assert.equal(lessonResponse.status(), 201, "admin uploads verified PDF with lesson");
    const lessonId = (await lessonResponse.json()).item.id;
    const publicFile = await adminPage.request.get(base + "/api/theory/" + lessonId + "/file");
    assert.equal(publicFile.status(), 200, "signed-in lesson viewers can open allowed PDF");
    assert.match(publicFile.headers()["content-type"], /application\/pdf/);
    assert.ok((await publicFile.body()).subarray(0, 5).equals(Buffer.from("%PDF-")));
    const guestFile = await fetch(base + "/api/theory/" + lessonId + "/file");
    assert.equal(guestFile.status, 401, "no anonymous access to lesson PDF");
    await adminPage.goto(base + "/admin/theory-lessons");
    await adminPage.getByRole("heading", { name: "Bài lý thuyết" }).waitFor();
    assert.equal(await adminPage.getByText("JSON editor").count(), 0, "lesson UI hides JSON editor");

    const planResponse = await adminPage.request.post(base + "/api/admin/plans", { data: {
      slug: "ci-vip-" + unique, name: "VIP kiểm thử", description: "Gói CI",
      price: 10000, interval: "MONTH", features: ["Đề VIP", "Lý thuyết nâng cao"], isActive: true,
    } });
    assert.equal(planResponse.status(), 201, "admin creates VIP plan");
    const planId = (await planResponse.json()).item.id;
    await adminPage.goto(base + "/admin/plans");
    await adminPage.getByRole("heading", { name: "Gói thành viên" }).waitFor();
    assert.equal(await adminPage.getByText("JSON editor").count(), 0, "VIP plan UI hides JSON editor");
    const checkoutResponse = await adminPage.request.post(base + "/api/payments/checkout", { data: { planId } });
    assert.equal(checkoutResponse.status(), 201, "checkout creates pending payment");
    const paymentId = (await checkoutResponse.json()).payment.id;
    await adminPage.goto(base + "/admin/payments");
    await adminPage.getByRole("heading", { name: "Thanh toán VIP" }).waitFor();
    assert.equal(await adminPage.getByText("JSON editor").count(), 0, "payment UI hides JSON editor");
    const paymentResponse = await adminPage.request.put(base + "/api/admin/payments/" + paymentId, { data: { status: "PAID" } });
    assert.equal(paymentResponse.status(), 200, "admin bank reconciliation activates VIP");
    assert.equal((await prisma.subscription.count({ where: { userId: account.id, planId, status: "ACTIVE" } })), 1);

    const deleteLesson = await adminPage.request.delete(base + "/api/admin/theory-lessons/manage", { data: { lessonId } });
    assert.equal(deleteLesson.status(), 200, "admin can delete uploaded lessons");
    await adminContext.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mobilePage = await mobile.newPage();
    // Intro is intentionally free of fixed bottom navigation; inner pages retain
    // the single-row tabs. Verify narrow Android-sized screens without horizontal scrolling.
    for (const width of [320, 390, 420]) {
      await mobilePage.setViewportSize({ width, height: 844 });
      await mobilePage.goto(base, { waitUntil: "domcontentloaded" });
      const heading = mobilePage.getByRole("heading", { name: /Luyện Đề Thông Minh/i });
      await heading.waitFor();
      const headlineSpans = heading.locator("span");
      assert.equal(await headlineSpans.count(), 2, "landing headline has two separately controlled lines");
      for (const segment of await headlineSpans.all()) {
        const lineCount = await segment.evaluate((element) => {
          const height = element.getBoundingClientRect().height;
          const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
          return height / lineHeight;
        });
        assert.ok(lineCount <= 1.1, "each headline phrase must stay on one line at " + width + "px");
      }
      assert.equal(await mobilePage.getByRole("navigation", { name: "Điều hướng chính trên điện thoại" }).count(), 0,
        "landing page must not have fixed bottom nav");

      await mobilePage.goto(base + "/login?role=student", { waitUntil: "domcontentloaded" });
      const tabs = mobilePage.getByRole("navigation", { name: "Điều hướng chính trên điện thoại" });
      const itemRects = [];
      for (const label of ["Trang chủ", "Môn học", "Đề thi", "Tài liệu", "Cửa hàng", "Xếp hạng", "Lớp học", "Đăng nhập"]) {
        const link = tabs.getByRole("link", { name: label, exact: true });
        await link.waitFor();
        itemRects.push(await link.boundingBox());
      }
      assert.ok(itemRects.every((rect) => rect && Math.abs(rect.y - itemRects[0].y) <= 1),
        "mobile navigation items must occupy one row at " + width + "px");
      const rectangle = await tabs.boundingBox();
      assert.ok(rectangle && Math.abs(rectangle.y + rectangle.height - 844) <= 2,
        "mobile navigation must stay fixed to the bottom at " + width + "px");
      const documentWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(documentWidth <= width + 1, "mobile layout overflows at " + width + "px");
      assert.equal(await mobilePage.getByRole("button", { name: "Mở menu điều hướng" }).count(), 0);
    }
    const examLink = await mobilePage.getByRole("navigation", { name: "Điều hướng chính trên điện thoại" })
      .getByRole("link", { name: "Đề thi" }).getAttribute("href");
    assert.match(examLink, /callbackUrl=%2Fexams/, "guest exam tab must retain login redirect");

    await mobilePage.goto(base + "/login?role=student");
    await mobilePage.getByRole("heading", { name: "Đăng nhập Học sinh" }).waitFor({ timeout: 20000 });
    assert.equal(await mobilePage.locator('input[type="password"]').count(), 1);
    assert.equal(await mobilePage.locator('input[type="email"]').count(), 1);
    assert.equal(await mobilePage.getByRole("button", { name: "Tiếp tục bằng Google" }).count(), 1);
    await mobile.close();

    console.log("Chromium smoke passed: two-line responsive headline, registration, session, role switching, admin protection, mobile navigation and mobile login.");
  } finally {
    await browser.close();
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error("Chromium browser smoke failed:", error.stack || error); process.exitCode = 1; });
