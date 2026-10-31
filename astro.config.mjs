import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

if (existsSync('.env')) loadEnvFile('.env');

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || undefined,
  output: 'static',
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
