// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// GitHub Pages build: static SPA served from a subfolder. Enabled only when GITHUB_PAGES=true
// (set in .github/workflows/deploy.yml), so the Lovable preview/publish keep working unchanged.
const isPages = process.env.GITHUB_PAGES === "true";
const pagesBase = process.env.PAGES_BASE || "/atacadao-da-construcao-russas-ce/";

export default defineConfig(
  isPages
    ? {
        vite: { base: pagesBase },
        nitro: false,
        tanstackStart: {
          server: { entry: "server" },
          router: { basepath: pagesBase },
          spa: { enabled: true, prerender: { outputPath: "/index.html" } },
        },
      }
    : {
        tanstackStart: {
          // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
          server: { entry: "server" },
        },
      },
);
