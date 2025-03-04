import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import notifier from "vite-plugin-notifier";

export default defineConfig({
  plugins: [
    react(),
    notifier(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  server: {
    port: 3000,
    allowedHosts: true,
    host: "0.0.0.0",
  },
  resolve: {
    alias: {
      process: "process/browser", // Polyfill for process
      stream: "stream-browserify", // Existing alias for stream
      crypto: "crypto-browserify",  // Alias for crypto
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  build: {
    outDir: "build",
    commonjsOptions: {
      ignoreTryCatch: false,
    },
  },
  esbuild: {
    jsxFactory: "_jsx",
    jsxFragment: "_jsxFragment",
    jsxInject: `import { createElement as _jsx, Fragment as _jsxFragment } from 'react'`,
  },
});
