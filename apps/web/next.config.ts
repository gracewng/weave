import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@weave/shared', '@weave/data', '@weave/clients'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};

export default nextConfig;
