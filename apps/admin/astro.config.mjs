import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site: import.meta.env.SITE_URL || 'https://admin.zyntel.net',
  security: {
    checkOrigin: false,
  },
});
