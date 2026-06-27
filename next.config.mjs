import withSerwistInit from "@serwist/next";

// PWA / Service Worker (offline-first das denúncias). Em desenvolvimento o SW
// fica desligado para o cache não atrapalhar o hot-reload.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite exibir fotos de denúncias hospedadas externamente (Supabase Storage, etc.).
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async rewrites() {
    return [
      {
        source: "/apresentacao",
        destination: "/apresentacao.html",
      },
    ];
  },
};

export default withSerwist(nextConfig);
