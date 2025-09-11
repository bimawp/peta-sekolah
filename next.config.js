/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/data/:path*',
        destination: 'https://peta-sekolah.vercel.app/data/:path*',
      },
    ];
  },
};

export default nextConfig;