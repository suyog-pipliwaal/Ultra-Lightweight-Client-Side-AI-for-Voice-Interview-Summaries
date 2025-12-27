import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to set correct MIME type for WASM files
    {
      name: 'configure-response-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm')
          }
          next()
        })
      }
    }
  ],
  server: {
    fs: {
      // Allow serving files from outside the project root
      allow: ['..']
    }
  },
  optimizeDeps: {
    // Exclude ONNX Runtime from pre-bundling (it needs to load WASM files at runtime)
    exclude: ['onnxruntime-web']
  },
  // Configure build to handle WASM files correctly
  build: {
    rollupOptions: {
      output: {
        // Ensure WASM files are copied correctly
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.wasm')) {
            return 'assets/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  // Ensure WASM files are handled correctly
  assetsInclude: ['**/*.wasm']
})
