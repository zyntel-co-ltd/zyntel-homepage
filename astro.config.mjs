import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: import.meta.env.SITE_URL || 'https://zyntel.net',
  security: {
    checkOrigin: false, // Allow POST from both admin.zyntel.net and preview.zyntel.net
  },
});
