/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false }
}
module.exports = nextConfig
