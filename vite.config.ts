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
    https: false,
    cors: true,
    // Force HTTP and prevent any HTTPS redirects
    headers: {
      'Strict-Transport-Security': 'max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-Forwarded-Proto': 'http',
      'X-Forwarded-Ssl': 'off'
    },
    // Disable HMR over HTTPS
    hmr: {
      port: 8081,
      host: 'localhost'
    }
  },
  plugins: [
    react({
      // Explicit JSX configuration for PM2 environment
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
      // Disable fast refresh in PM2 environment to prevent issues
      fastRefresh: process.env.PM2_HOME ? false : true
    }),
    mode === 'development' && !process.env.PM2_HOME &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // PM2 specific optimizations
  build: {
    sourcemap: false,
    minify: mode === 'production'
  },
  // Ensure JSX works in PM2 environment
  esbuild: {
    jsx: 'automatic',
    jsxDev: mode === 'development' && !process.env.PM2_HOME,
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment'
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime']
  }
}));
