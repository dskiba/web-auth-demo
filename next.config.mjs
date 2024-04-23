/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/biometric-auth',
  reactStrictMode: true,
  output: "export",  // <=== enables static exports
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
