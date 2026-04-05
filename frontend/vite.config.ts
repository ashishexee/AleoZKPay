import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    optimizeDeps: {
        exclude: ['@provablehq/wasm'],
    },
    server: {
        allowedHosts: [
            'localhost',
            '127.0.0.1',
            '.ngrok-free.dev',
            '.ngrok.app',
            '.trycloudflare.com'
        ],
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
    },
})
