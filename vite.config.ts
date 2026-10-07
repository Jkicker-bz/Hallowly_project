import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// Two pages: the current site (index.html) and the Figma redesign (new.html -> /new).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { rollupOptions: { input: { main: resolve(__dirname, "index.html"), new: resolve(__dirname, "new.html") } } },
});
