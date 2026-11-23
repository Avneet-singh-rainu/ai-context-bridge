import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

// electron-vite defaults: src/main, src/preload, and src/renderer (index.html + src/).
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react()],
  },
});
