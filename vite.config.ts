import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [react()],
  server: isProd
    ? undefined
    : {
        port: 5173,
        https: {
          key: fs.readFileSync('./certs/localhost-key.pem'),
          cert: fs.readFileSync('./certs/localhost.pem'),
        },
      },
})
