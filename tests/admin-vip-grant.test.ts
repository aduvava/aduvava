import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { grantAdminVip, addVipDays, type VipGrantRequest } from "../src/lib/admin-vip-grant";
import type { PrismaClient } from "@prisma/client";

const initial: VipGrantRequest = {
  requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  adminId: "admin-1", userId: "student-1", planId: "plan-1",
  days: 30, note: "Tặng VIP cho học sinh",
};

function fakeDb() {
  let state = {
    subscriptions: [] as Array<{ id: string; userId: string; planId: string; status: string; startsAt: Date; endsAt: Date }>,
    audits: [] as Array<VipGrantRequest & { subscriptionId: string; startsAt: Date; endsAt: Date }>,
    notifications: [] as unknown[],
  };
  const db = {
    get state() { return state; },
    async $transaction(callback: (tx: unknown) => Promise<unknown>, opts: { isolationLevel: string }) {
      assert.equal(opts.isolationLevel, "Serializable");
      const copy = structuredClone(state);
      const tx = {
        adminVipGrant: {
          findUnique: async ({ where }: { where: { requestId: string } }) =>
            copy.audits.find((item) => item.requestId === where.requestId) ?? null,
          create: async ({ data }: { data: VipGrantRequest & { subscriptionId: string; startsAt: Date; endsAt: Date } }) => {
            if (copy.audits.some((item) => item.requestId === data.requestId)) throw Error("Duplicate audit");
            copy.audits.push(data);
          },
        },
        user: {
          findUnique: async ({ where }: { where: { id: string } }) =>
            where.id === "student-1" ? { id: "student-1", email: "student@example.test" } : null,
        },
        plan: {
          findUnique: async ({ where }: { where: { id: string } }) =>
            where.id === "plan-1" ? { id: "plan-1", name: "VIP 39k", isActive: true } : null,
        },
        subscription: {
          findFirst: async () => copy.subscriptions.filter((sub) => sub.status === "ACTIVE" && sub.endsAt > new Date())
            .sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime())[0] ?? null,
          create: async ({ data }: { data: Omit<(typeof copy.subscriptions)[number], "id"> }) => {
            const sub = { id: "subscription-" + (copy.subscriptions.length + 1), ...data };
            copy.subscriptions.push(sub);
            return sub;
          },
        },
        notification: { create: async ({ data }: { data: unknown }) => { copy.notifications.push(data); } },
      };
      const result = await callback(tx);
      state = copy;
      return result;
    },
    adminVipGrant: {
      findUnique: async ({ where }: { where: { requestId: string } }) =>
        state.audits.find((item) => item.requestId === where.requestId) ?? null,
    },
  };
  return db;
}

describe("administrator VIP gift workflow", () => {
  it("adds a bounded duration and validates day count", () => {
    const now = new Date("2026-11-06T10:00:00.000Z");
    assert.equal(addVipDays(now, 30).toISOString(), "2026-12-06T10:00:00.000Z");
    assert.throws(() => addVipDays(now, 0));
    assert.throws(() => addVipDays(now, 366));
    assert.throws(() => addVipDays(now, 4.5));
  });

  it("records one VIP and a single audit entry for duplicate requests", async () => {
    const db = fakeDb();
    const first = await grantAdminVip(db as unknown as PrismaClient, initial);
    assert.equal(first.activated, true);
    assert.equal(db.state.subscriptions.length, 1);
    assert.equal(db.state.audits.length, 1);
    assert.equal(db.state.notifications.length, 1);
    const second = await grantAdminVip(db as unknown as PrismaClient, initial);
    assert.equal(second.activated, false);
    assert.equal(second.subscriptionId, first.subscriptionId);
    assert.equal(db.state.subscriptions.length, 1);
    assert.equal(db.state.notifications.length, 1);
    await assert.rejects(grantAdminVip(db as unknown as PrismaClient, { ...initial, days: 60 }), /đã được sử dụng/);
  });

  it("extends the current VIP without clearing previous rights or creating payments", async () => {
    const db = fakeDb();
    await grantAdminVip(db as unknown as PrismaClient, initial);
    const oldEnd = db.state.subscriptions[0].endsAt;
    const next = await grantAdminVip(db as unknown as PrismaClient, {
      ...initial, requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      days: 7,
    });
    assert.equal(next.activated, true);
    assert.equal(db.state.subscriptions.length, 2);
    assert.equal(db.state.subscriptions[1].startsAt.toISOString(), oldEnd.toISOString());
    assert.equal(db.state.subscriptions[1].endsAt.toISOString(), addVipDays(oldEnd, 7).toISOString());
    assert.equal(db.state.audits.length, 2);
  });

  it("never grants VIP to a nonexistent user or with an inactive plan", async () => {
    const db = fakeDb();
    await assert.rejects(grantAdminVip(db as unknown as PrismaClient, { ...initial, userId: "not-found" }), /Không tìm thấy/);
    await assert.rejects(grantAdminVip(db as unknown as PrismaClient, { ...initial, planId: "bad-plan" }), /không tồn tại/);
    assert.equal(db.state.subscriptions.length, 0);
    assert.equal(db.state.audits.length, 0);
  });
});
