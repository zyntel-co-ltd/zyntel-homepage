import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

const NOINDEX_PATHS = ['/careers', '/newsletter', '/demos', '/faqs'];

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: 'https://zyntel.net',
  integrations: [
    sitemap({
      filter: (page) => {
        try {
          const path = new URL(page).pathname;
          if (NOINDEX_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
            return false;
          }
          return true;
        } catch {
          return false;
        }
      },
    }),
  ],
  security: {
    checkOrigin: false, // Allow POST from both admin.zyntel.net and preview.zyntel.net
  },
});
