import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: process.env.HOST || "127.0.0.1",
    port: parsePort(process.env.PORT, 5173),
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    reportCompressedSize: false,
    sourcemap: false,          // never emit sourcemaps in prod
    chunkSizeWarningLimit: 1000,
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

