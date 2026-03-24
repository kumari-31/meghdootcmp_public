import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  // base: "/static/",
  // build: {
  //   outDir: "dist",
  //   assetsDir: "assets",
  //   emptyOutDir: true,
  // },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/v2': {
        target: 'http://10.184.43.88:8000',
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
})
