"use strict";

// This service is deployed behind an HTTPS reverse proxy. Never accept an
// authenticated cross-site HTML form POST, including payment confirmations.
function trustedPostOrigin(req, configuredOrigin = process.env.ADMIN_PUBLIC_ORIGIN) {
  const source = req.headers.origin || req.headers.referer;
  if (typeof source !== "string" || !source || source === "null") return false;

  try {
    const origin = new URL(source);
    if (!["https:", "http:"].includes(origin.protocol)) return false;
    if (configuredOrigin) {
      const expected = new URL(configuredOrigin);
      return expected.origin === origin.origin;
    }
    // For localhost development only; production should set ADMIN_PUBLIC_ORIGIN
    // to the externally reachable HTTPS URL to handle reverse proxies.
    const host = req.headers.host;
    return typeof host === "string" && host.toLowerCase() === origin.host.toLowerCase();
  } catch {
    return false;
  }
}

function cookieSecuritySuffix(req, configuredOrigin = process.env.ADMIN_PUBLIC_ORIGIN) {
  if (configuredOrigin?.startsWith("https://") || req.socket?.encrypted) return "; Secure";
  return "";
}

module.exports = { trustedPostOrigin, cookieSecuritySuffix };
