import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({

  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    open: true,
    hmr: {
      overlay: false,
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
  optimizeDeps: {
    force: false,
    include: [],
    exclude: [], // depends on your stack
  },
});
