/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 👈 enables static export for GitHub Pages
  images: { unoptimized: true }, // avoids Next Image optimization
  basePath: '/mapafome_homolog', // 👈 required for GitHub Pages path
  assetPrefix: '/mapafome_homolog/',

  reactStrictMode: false,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, child_process: false, os: false, net: false, tls: false, url: false };
    return config;
  },
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
