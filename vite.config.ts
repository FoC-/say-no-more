import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    target: "esnext",
    minify: "terser",
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "snm",
      formats: ["es", "umd", "iife"],
    },
    terserOptions: {
      module: true,
      compress: {
        drop_console: true,
        toplevel: true,
        unsafe_math: true,
        passes: 10,
      },
    },
  },
});
