import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{manifest:true,target:'esnext',outDir:'dist/admin',rollupOptions:{input:['admin/index.html','admin/themes.html','admin/preview.html']}},publicDir:'public'});
