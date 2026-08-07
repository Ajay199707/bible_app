import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative base path so assets load seamlessly on GitHub Pages and local servers
  build: {
    outDir: 'dist'
  }
});
