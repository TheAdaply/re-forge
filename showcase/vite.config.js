import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Multi-page build, base "/" (apex custom domain). Two real HTML entry points:
//   index.html            -> /            (the React hero)
//   dashboard/index.html  -> /dashboard/  (vanilla customer dashboard)
// Real files mean deep-links + refresh work on GitHub Pages with no router.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(here, "index.html"),
        dashboard: resolve(here, "dashboard/index.html"),
        signin: resolve(here, "signin/index.html"),
      },
    },
  },
});
