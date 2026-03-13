import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: 'https://zyntel.net',
  security: {
    checkOrigin: false, // Allow POST from preview URLs (e.g. *.vercel.app) when site is zyntel.net
  },
});
