import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@worthit/shared', '@worthit/data', '@worthit/clients'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};

export default nextConfig;
