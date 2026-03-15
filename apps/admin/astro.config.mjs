import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: import.meta.env.SITE_URL || 'https://admin.zyntel.net',
  security: {
    checkOrigin: false,
  },
});
