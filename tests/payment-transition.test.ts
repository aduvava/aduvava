import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { transitionManualPayment, extendUtcMonths, PaymentTransitionError } =
  require("../src/lib/payment-transition.js");

type MockPayment = {
  id: string; userId: string; planId: string; status: string;
  provider: string; reference: string; metadata: Record<string, unknown>;
  plan: { id: string; name: string; interval: string };
};
type MockSePayReceipt = { eventId: string; paymentId: string };
type MockSubscription = {
  id: string; userId: string; planId: string; status: string;
  startsAt: Date; endsAt: Date;
};

function createFakeDb(opts?: { payment?: Partial<MockPayment>; failUpdate?: boolean; receipts?: MockSePayReceipt[] }) {
  let state = {
    payment: {
      id: "payment-1", userId: "student-1", planId: "plan-1",
      status: "PENDING", provider: "manual-bank-transfer",
      reference: "EDUVA-SMOKE", metadata: {},
      plan: { id: "plan-1", name: "VIP", interval: "MONTH" },
      ...opts?.payment,
    } as MockPayment,
    subscriptions: [] as MockSubscription[],
    notifications: [] as Array<{ userId: string; href: string }>,
    receipts: opts?.receipts ?? [] as MockSePayReceipt[],
  };
  const db = {
    get state() { return state; },
    async $transaction(callback: (tx: any) => Promise<unknown>, txOptions: { isolationLevel?: string }) {
      assert.equal(txOptions.isolationLevel, "Serializable");
      const snapshot = structuredClone(state);
      const tx = {
        sePayReceipt: {
          findUnique: async ({ where }: { where: { eventId: string } }) =>
            snapshot.receipts.find((record) => record.eventId === where.eventId) ?? null,
          create: async ({ data }: { data: MockSePayReceipt }) => {
            if (snapshot.receipts.some((record) => record.eventId === data.eventId || record.paymentId === data.paymentId)) {
              const error = new Error("Unique constraint violation") as Error & { code: string };
              error.code = "P2002";
              throw error;
            }
            snapshot.receipts.push(data);
            return data;
          },
        },
        payment: {
          findUnique: async () => snapshot.payment,
          update: async ({ data }: { data: Partial<MockPayment> }) => {
            if (opts?.failUpdate) throw new Error("Simulated database write failure");
            Object.assign(snapshot.payment, data);
            return snapshot.payment;
          },
        },
        subscription: {
          findFirst: async () => snapshot.subscriptions
            .filter((s) => s.status === "ACTIVE" && s.endsAt > new Date())
            .sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime())[0] ?? null,
          findUnique: async ({ where }: { where: { id: string } }) =>
            snapshot.subscriptions.find((s) => s.id === where.id) ?? null,
          create: async ({ data }: { data: Omit<MockSubscription, "id"> }) => {
            const item = { ...data, id: "subscription-" + (snapshot.subscriptions.length + 1) };
            snapshot.subscriptions.push(item);
            return item;
          },
        },
        notification: {
          create: async ({ data }: { data: { userId: string; href: string } }) => {
            snapshot.notifications.push(data);
          },
        },
      };
      const result = await callback(tx);
      state = snapshot; // all-or-nothing commit
      return result;
    },
  };
  return db;
}

describe("atomic manual VIP transitions", () => {
  it("activates once and subsequent PAID requests do not grant VIP twice", async () => {
    const db = createFakeDb();
    const first = await transitionManualPayment(db, "payment-1", "PAID");
    assert.equal(first.activated, true);
    assert.equal(db.state.payment.status, "PAID");
    assert.equal(db.state.subscriptions.length, 1);
    assert.equal(db.state.notifications.length, 1);
    assert.equal(db.state.payment.metadata.vipSubscriptionId, first.subscriptionId);

    const second = await transitionManualPayment(db, "payment-1", "PAID");
    assert.equal(second.activated, false);
    assert.equal(db.state.subscriptions.length, 1);
    assert.equal(db.state.notifications.length, 1);
  });

  it("activates a SePay webhook once and deduplicates delivery retries", async () => {
    const db = createFakeDb();
    const first = await transitionManualPayment(db, "payment-1", "PAID", "551901");
    assert.equal(first.activated, true);
    assert.equal(db.state.payment.metadata.sepayEventId, "551901");
    assert.equal(db.state.receipts.length, 1);

    const repeat = await transitionManualPayment(db, "payment-1", "PAID", "551901");
    assert.equal(repeat.activated, false);
    assert.equal(db.state.receipts.length, 1);
    assert.equal(db.state.subscriptions.length, 1);
    assert.equal(db.state.notifications.length, 1);
  });

  it("blocks a SePay event receipt already linked to another payment", async () => {
    const db = createFakeDb({ receipts: [{ eventId: "999", paymentId: "another-order" }] });
    await assert.rejects(
      transitionManualPayment(db, "payment-1", "PAID", "999"),
      /already belongs to another payment/,
    );
    assert.equal(db.state.payment.status, "PENDING");
    assert.equal(db.state.subscriptions.length, 0);
  });

  it("rolls back bank event receipt when VIP update fails", async () => {
    const db = createFakeDb({ failUpdate: true });
    await assert.rejects(transitionManualPayment(db, "payment-1", "PAID", "9001"), /Simulated database/);
    assert.equal(db.state.receipts.length, 0);
    assert.equal(db.state.subscriptions.length, 0);
  });

  it("leaves a payment unsettled if the subscription/payment transaction fails", async () => {
    const db = createFakeDb({ failUpdate: true });
    await assert.rejects(transitionManualPayment(db, "payment-1", "PAID"), /Simulated database/);
    assert.equal(db.state.payment.status, "PENDING");
    assert.equal(db.state.subscriptions.length, 0);
    assert.equal(db.state.notifications.length, 0);
  });

  it("refuses PAID reversals, legacy reconciliation, and duplicate marker inconsistencies", async () => {
    const db = createFakeDb();
    await transitionManualPayment(db, "payment-1", "PAID");
    await assert.rejects(transitionManualPayment(db, "payment-1", "FAILED"), PaymentTransitionError);
    assert.equal(db.state.payment.status, "PAID");

    const legacy = createFakeDb({ payment: { status: "PAID", metadata: { adminVipActivatedAt: "old" } } });
    await assert.rejects(transitionManualPayment(legacy, "payment-1", "PAID"), /reconciliation/);
    assert.equal(legacy.state.subscriptions.length, 0);
  });

  it("does not issue VIP for FAILED and correctly clamps calendar month ends", async () => {
    const db = createFakeDb();
    const fail = await transitionManualPayment(db, "payment-1", "FAILED");
    assert.equal(fail.activated, false);
    assert.equal(db.state.subscriptions.length, 0);

    assert.equal(extendUtcMonths(new Date("2026-01-31T10:00:00Z"), 1).toISOString(),
      "2026-02-28T10:00:00.000Z");
    assert.equal(extendUtcMonths(new Date("2028-01-31T10:00:00Z"), 1).toISOString(),
      "2028-02-29T10:00:00.000Z");
  });
});
