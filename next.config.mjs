/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cesium uses dynamic imports and WASM workers — needs transpilation
  transpilePackages: ["cesium", "resium"],
  webpack: (config, { isServer }) => {
    // Cesium references CESIUM_BASE_URL for worker/asset paths at runtime
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: "raw-loader",
    });

    // Suppress Cesium's critical dependency warnings from dynamic requires
    config.module.unknownContextCritical = false;
    config.module.exprContextCritical = false;

    return config;
  },
};

export default nextConfig;
