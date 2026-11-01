import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { trustedPostOrigin, cookieSecuritySuffix } = require("../admin-server/request-security.js");

function request(origin: string | undefined, host = "127.0.0.1:4000", referer?: string) {
  return { headers: { host, origin, referer }, socket: { encrypted: false } };
}
describe("standalone admin anti-CSRF and cookies", () => {
  it("accepts same-origin form requests and rejects external/opaque origins", () => {
    assert.equal(trustedPostOrigin(request("http://127.0.0.1:4000")), true);
    assert.equal(trustedPostOrigin(request("https://evil.example")), false);
    assert.equal(trustedPostOrigin(request("null")), false);
    assert.equal(trustedPostOrigin(request(undefined)), false);
    assert.equal(trustedPostOrigin(request(undefined, "127.0.0.1:4000", "http://127.0.0.1:4000/payments")), true);
    assert.equal(trustedPostOrigin(request("https://admin.evil.example", "admin.example")), false);
  });
  it("supports explicit HTTPS reverse-proxy origin and secure cookies", () => {
    assert.equal(trustedPostOrigin(request("https://admin.example", "admin:4000"), "https://admin.example"), true);
    assert.equal(trustedPostOrigin(request("http://admin.example", "admin:4000"), "https://admin.example"), false);
    assert.equal(cookieSecuritySuffix(request("http://127.0.0.1:4000"), "https://admin.example"), "; Secure");
    assert.equal(cookieSecuritySuffix(request("http://127.0.0.1:4000")), "");
  });
});
