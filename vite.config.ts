import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    historyApiFallback: true,
    strictPort: true,
    https: false, // Force HTTP only
    cors: true,
    // Headers to prevent HTTPS upgrade
    headers: {
      'Strict-Transport-Security': 'max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
