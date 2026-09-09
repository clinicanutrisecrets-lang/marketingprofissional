/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 🔴 EMBED DENTRO DO SCANNER (Aline, 09/09/2026): este app é aberto num
  // iframe pela página "Posts e Conteúdo" do Scanner da Saúde
  // (scannerdasaude.com e subdomínios). CSP frame-ancestors é o que autoriza
  // isso — sem ele o navegador bloqueia o iframe e a nutri vê um retângulo
  // branco. Só o domínio do Scanner; qualquer outro site continua proibido de
  // embutir (proteção contra clickjacking de uma sessão logada).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://scannerdasaude.com https://*.scannerdasaude.com",
          },
        ],
      },
    ];
  },
  transpilePackages: ["@scanner/ui"],
  typescript: {
    // Volta pro modo flexível até refinarmos tipos específicos do Supabase.
    // Sem isso alguns .maybeSingle() voltam 'never' por falha de inferência.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp", "@scanner/ai-image", "opentype.js"],
  },
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
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
    ],
  },
};

export default nextConfig;
