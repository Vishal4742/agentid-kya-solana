import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    reportCompressedSize: false,
    sourcemap: false,          // never emit sourcemaps in prod
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("@coral-xyz/anchor") || id.includes("@solana/")) {
            return "solana";
          }

          if (id.includes("react") || id.includes("scheduler")) {
            return "react-vendor";
          }

          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts";
          }

          return "vendor";
        },
      },
    },
    // Strip all console.* calls and debugger statements from the production bundle
    minify: "esbuild",
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  define: {
    // Required by @solana/web3.js and wallet adapter packages in browser
    "process.env": {},
    global: "globalThis",
  },
}));

