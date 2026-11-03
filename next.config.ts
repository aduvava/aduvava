import type { NextConfig } from "next";
import { studentSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: studentSecurityHeaders(process.env.NODE_ENV === "production") }];
  },
};

export default nextConfig;
