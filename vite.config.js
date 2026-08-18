import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, existsSync } from "fs";

/* Huddle keeps every file in one flat folder, with no public/ subdirectory.
   Vite only serves static assets out of publicDir, so without this the icons
   and manifest are never copied into dist and an installed app shows a blank
   home screen icon. This copies them through verbatim, in dev and in build. */
const STATIC_FILES = [
  "manifest.webmanifest",
  "icon.svg",
  "icon-maskable.svg",
  "icon-192.png",
  "icon-512.png",
  "icon-180.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png",
  "favicon-64.png",
];

const MIME = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

function flatStaticAssets() {
  return {
    name: "huddle-flat-static",
    // dev server: serve them straight off the project root
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url || "").split("?")[0].replace(/^\//, "");
        if (!STATIC_FILES.includes(name) || !existsSync(name)) return next();
        const ext = name.slice(name.lastIndexOf("."));
        res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
        res.end(readFileSync(name));
      });
    },
    // build: emit each one at its original name, unhashed
    generateBundle() {
      for (const name of STATIC_FILES) {
        if (!existsSync(name)) continue;
        this.emitFile({ type: "asset", fileName: name, source: readFileSync(name) });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), flatStaticAssets()],
  server: { host: true, port: 5173 },
  build: { outDir: "dist" },
});
