// Conservative baseline for the student-facing Next.js application.
// Inline hydration scripts/styles are currently required by the app; replacing
// them with per-request nonces is a separate hardening effort.
const productionCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Exact vetted QR image hosts only; no wildcard expansion of img-src.
  "img-src 'self' data: blob: https://*.googleusercontent.com https://vietqr.app https://img.vietqr.io",
  "connect-src 'self'",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

export function studentSecurityHeaders(production: boolean): { key: string; value: string }[] {
  const values = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ];
  if (production) values.push(
    { key: "Strict-Transport-Security", value: "max-age=31536000" },
    { key: "Content-Security-Policy", value: productionCsp },
  );
  return values;
}
