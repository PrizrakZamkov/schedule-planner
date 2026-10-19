import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// single html file so the build opens with a double click
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
})
