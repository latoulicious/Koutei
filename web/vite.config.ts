import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// fs.allow lets the build import the committed seed at repo tools/ (single source,
// no copy to drift). proxy forwards /api to the Go engine in dev.
export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    fs: { allow: [".."] },
    proxy: { "/api": "http://localhost:8080" },
  },
});
