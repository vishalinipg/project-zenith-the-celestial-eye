import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // cesium and resium must be in transpilePackages so that webpack correctly
  // processes their ESM exports (they are "type":"module" packages). Without
  // this, Terser fails on ESM export/import inside a CJS wrapper.
  transpilePackages: ["cesium", "resium"],
  webpack: (config, { isServer }) => {
    // ──────────────────────────────────────────────────────────────────────
    // Fix: @spz-loader/core (a Cesium dependency) ships a pre-built ESM dist
    // that embeds WASM binary data as template literal strings containing
    // octal escape sequences (\0, \1 … \7). These are ILLEGAL in strict-mode
    // template literals (ES2016+) and cause a runtime SyntaxError in browsers:
    //   "Octal escape sequences are not allowed in template strings."
    // The custom loader pre-processes the file to convert these to safe hex
    // escapes (\x00, \x01 … \x07) before SWC/webpack sees them.
    // ──────────────────────────────────────────────────────────────────────
    config.module.rules.unshift({
      test: /[\\/]@spz-loader[\\/]core[\\/]/,
      use: [
        {
          loader: path.resolve(__dirname, "scripts/fix-octal-escape-loader.js"),
        },
      ],
    });

    // Handle GLSL shader files
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
