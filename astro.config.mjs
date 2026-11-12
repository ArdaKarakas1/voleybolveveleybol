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

  // Astro küçük betikleri HTML'in içine gömer, güvenlik başlığı (CSP) gömülü betiği engeller.
  // Bu ayar her betiğin ayrı bir dosya olarak /_astro/ altına yazılmasını sağlar.
  vite: { build: { assetsInlineLimit: 0 } },

  devToolbar: { enabled: false }
});
