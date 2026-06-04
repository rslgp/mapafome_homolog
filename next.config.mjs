const nextConfig = {
  allowedDevOrigins: ['10.20.30.191', '8a34-2804-372c-13e-ac00-3911-8220-33e7-e7b5.ngrok-free.app'],

  output: 'export',
  images: { unoptimized: true },

  // ❌ REMOVE these:
  // basePath: '/mapafome_homolog',
  // assetPrefix: '/mapafome_homolog/',

  reactStrictMode: false,
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false, child_process: false, os: false, net: false, tls: false, url: false
    };
    return config;
  },
  reactCompiler: true,
};

export default nextConfig;