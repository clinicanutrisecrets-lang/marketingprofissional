/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp", "@scanner/ai-image"],
  },
  // Marca sharp como external pro webpack não bundlar (tem binário nativo).
  // Em route handlers o serverComponentsExternalPackages nao basta — precisa
  // desse config explicito no webpack pra Next 14.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = Array.isArray(config.externals)
        ? [...config.externals, "sharp"]
        : [config.externals, "sharp"].filter(Boolean);
    }
    return config;
  },
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
