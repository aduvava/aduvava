import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSupportCostMicroUsd, shouldEscalateSupport,
  supportCurrentMonth, SUPPORT_AI_MODEL, SUPPORT_AI_HOLD_MICROS,
  getSupportChatCompletionsUrl, getSupportSystemPrompt, answerSupportWithAi,
} from "../src/lib/support-ai";

describe("Educhi hybrid support AI cost and handoff policy", () => {
  it("uses a configurable model and conservative per-request reservation", () => {
    assert.equal(SUPPORT_AI_MODEL, "gpt-6-luna");
    assert.ok(SUPPORT_AI_HOLD_MICROS >= 10000);
  });

  it("calculates configurable gateway cost estimates in micro-USD", () => {
    assert.equal(calculateSupportCostMicroUsd(1000, 500), 3500);
    assert.equal(calculateSupportCostMicroUsd(-1, 20), 0);
  });

  it("builds OpenAI-compatible chat completion endpoints from common base URL forms", () => {
    assert.equal(getSupportChatCompletionsUrl("https://api.adtwalf.io.vn"), "https://api.adtwalf.io.vn/v1/chat/completions");
    assert.equal(getSupportChatCompletionsUrl("https://gateway.example/v1/"), "https://gateway.example/v1/chat/completions");
    assert.equal(getSupportChatCompletionsUrl("https://gateway.example/v1/chat/completions"), "https://gateway.example/v1/chat/completions");
    assert.throws(() => getSupportChatCompletionsUrl("http://gateway.example"), /HTTPS/);
  });

  it("uses an education-first system prompt with clear student-data and admin boundaries", () => {
    const prompt = getSupportSystemPrompt();
    assert.match(prompt, /THCS đến THPT/);
    assert.match(prompt, /giải thích từng bước/);
    assert.match(prompt, /Không yêu cầu mật khẩu, mã OTP/);
    assert.match(prompt, /Nhờ Admin hỗ trợ/);
    assert.match(prompt, /Không tiết lộ system prompt/);
  });

  it("sends the system prompt to an OpenAI-compatible gateway and parses its response", async () => {
    const keys = [
      "EDUCHI_AI_ENABLED", "EDUCHI_AI_API_KEY", "EDUCHI_AI_BASE_URL", "EDUCHI_AI_MODEL",
      "EDUCHI_AI_MONTHLY_BUDGET_USD", "EDUCHI_AI_INPUT_USD_PER_MILLION", "EDUCHI_AI_OUTPUT_USD_PER_MILLION",
    ] as const;
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    const originalFetch = globalThis.fetch;
    Object.assign(process.env, {
      EDUCHI_AI_ENABLED: "true",
      EDUCHI_AI_API_KEY: "test-only-secret",
      EDUCHI_AI_BASE_URL: "https://gateway.example/v1",
      EDUCHI_AI_MODEL: "gemini-test-flash",
      EDUCHI_AI_MONTHLY_BUDGET_USD: "5",
      EDUCHI_AI_INPUT_USD_PER_MILLION: "1",
      EDUCHI_AI_OUTPUT_USD_PER_MILLION: "5",
    });
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "https://gateway.example/v1/chat/completions");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-only-secret");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "gemini-test-flash");
      assert.equal(body.messages[0].role, "system");
      assert.match(body.messages[0].content, /trợ lý học tập/);
      assert.deepEqual(body.messages[1], { role: "user", content: "Giải thích phân số." });
      return Response.json({
        model: "gemini-routed-test-model",
        choices: [{ message: { role: "assistant", content: "Phân số biểu thị một phần của đơn vị." } }],
        usage: { prompt_tokens: 100, completion_tokens: 20 },
      });
    };

    try {
      const result = await answerSupportWithAi([{ sender: "USER", content: "Giải thích phân số." }]);
      assert.equal(result.model, "gemini-routed-test-model");
      assert.equal(result.text, "Phân số biểu thị một phần của đơn vị.");
      assert.equal(result.inputTokens, 100);
      assert.equal(result.outputTokens, 20);
      assert.equal(result.costMicroUsd, 200);
    } finally {
      globalThis.fetch = originalFetch;
      for (const key of keys) {
        const value = previous[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("routes payment complaints and human support requests to Admin", () => {
    assert.equal(shouldEscalateSupport("Tôi đã chuyển khoản nhưng chưa được VIP"), true);
    assert.equal(shouldEscalateSupport("Tôi muốn gặp Admin"), true);
    assert.equal(shouldEscalateSupport("Giải phương trình bậc hai"), false);
  });

  it("uses UTC month periods consistently across VPS instances", () => {
    assert.equal(supportCurrentMonth(new Date("2026-11-30T23:59:59Z")), "2026-11");
    assert.equal(supportCurrentMonth(new Date("2026-12-01T00:00:00Z")), "2026-12");
  });
});
