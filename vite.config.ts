import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Resolve spellId → icon slug (Wowhead TBC dataEnv=5)
      "/wowhead-tooltip": {
        target: "https://nether.wowhead.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wowhead-tooltip/, "/tooltip"),
      },
    },
  },
  test: {
    environment: "node",
  },
});

