/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@scanner/ui",
    "@scanner/db",
    "@scanner/instagram",
    "@scanner/claude",
    "@scanner/bannerbear",
    "@scanner/meta-ads",
    "@scanner/heygen",
    "@scanner/benchmarks",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "cdn.bannerbear.com" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
      { protocol: "https", hostname: "*.heygen.ai" },
    ],
  },
};

export default nextConfig;
