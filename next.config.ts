import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship your original site files (private-site/) with the deployment,
  // so they can be served to logged-in users.
  outputFileTracingIncludes: {
    "/*": ["private-site/**/*"],
  },
  experimental: {
    serverActions: {
      // Signing out uses a Next.js "server action". When you test inside GitHub Codespaces
      // the address you open differs from the one Next sees, and Next blocks it with
      // "Invalid Server Actions request". These addresses are allowed to do it.
      allowedOrigins: ["localhost:3000", "*.app.github.dev", "*.github.dev", "*.vercel.app"],
    },
  },
};

export default nextConfig;