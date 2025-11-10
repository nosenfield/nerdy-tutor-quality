import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Exclude Bull from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    
    // Exclude Bull's child process files from build
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        'bull/lib/process/master': 'commonjs bull/lib/process/master',
        'bull/lib/process/child-pool': 'commonjs bull/lib/process/child-pool',
      });
    }
    
    return config;
  },
};

export default nextConfig;
