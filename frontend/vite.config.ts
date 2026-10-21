import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  // GitHub Pages serves from /<repo>/; Vercel and Docker serve from the root.
  base: isGitHubActions && repositoryName ? `/${repositoryName}/` : "/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": process.env.API_PROXY_TARGET ?? "http://localhost:4000"
    },
    // Polling is needed for hot reload through Docker bind mounts on Windows/macOS.
    watch: process.env.VITE_USE_POLLING === "true" ? { usePolling: true, interval: 300 } : undefined
  }
});
