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
    // Google is offered first but must be disabled until OAuth credentials exist.
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

    await page.goto(base + "/teacher");
    await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15000 });
    await page.goto(base + "/admin");
    await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15000 });
    await desktop.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mobilePage = await mobile.newPage();
    // Check the landing page at narrow mobile widths and exercise the real drawer.
    for (const width of [320, 390]) {
      await mobilePage.setViewportSize({ width, height: 844 });
      await mobilePage.goto(base, { waitUntil: "domcontentloaded" });
      await mobilePage.getByRole("heading", { name: /Luyện Đề Thông Minh/i }).waitFor();
      const documentWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(documentWidth <= width + 1, "mobile landing overflows at " + width + "px");
    }
    await mobilePage.getByRole("button", { name: "Mở menu điều hướng" }).click();
    const drawer = mobilePage.getByRole("dialog", { name: "Menu điều hướng" });
    await drawer.getByRole("link", { name: "Đề thi" }).waitFor();
    assert.equal(await mobilePage.evaluate(() => document.body.style.overflow), "hidden");
    await mobilePage.keyboard.press("Escape");
    await drawer.waitFor({ state: "hidden" });
    assert.equal(await mobilePage.evaluate(() => document.body.style.overflow), "");

    await mobilePage.goto(base + "/login?role=student");
    await mobilePage.getByRole("heading", { name: "Đăng nhập Học sinh" }).waitFor({ timeout: 20000 });
    assert.equal(await mobilePage.locator('input[type="password"]').count(), 1);
    assert.equal(await mobilePage.locator('input[type="email"]').count(), 1);
    assert.equal(await mobilePage.getByRole("button", { name: "Đăng nhập bằng Google" }).count(), 1);
    await mobile.close();

    console.log("Chromium smoke passed: home, login guard, registration, session, RBAC, mobile layout and drawer, mobile login.");
  } finally {
    await browser.close();
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error("Chromium browser smoke failed:", error.stack || error); process.exitCode = 1; });
