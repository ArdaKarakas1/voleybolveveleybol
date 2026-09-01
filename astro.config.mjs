import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://voleybolveveleybol.com',

  // Sayfalar /kurallar/ gibi sondaki eğik çizgiyle yayınlanıyor; mevcut
  // bağlantılar ve arama motoru kayıtları bu biçimde. Astro da öyle üretsin.
  trailingSlash: 'always',
  build: { format: 'directory' },

  // Netlify Functions repo kökünde duruyor (netlify/functions) — Astro'nun
  // çıktısına karışmaz. Statik dosyalar public/ altından olduğu gibi kopyalanır.
  outDir: './dist',
  publicDir: './public',

  compressHTML: true,

  devToolbar: { enabled: false }
});
