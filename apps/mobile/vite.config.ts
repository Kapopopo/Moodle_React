import { networkInterfaces } from 'node:os';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let apiUrl = env.VITE_API_URL?.trim();
  if (command === 'build' && (!apiUrl || apiUrl === 'auto')) {
    let addresses: string[] = [];
    try {
      addresses = Object.entries(networkInterfaces())
        .filter(([name]) => !/^(lo|docker|br-|veth|virbr|tun|tap|wg)/i.test(name))
        .flatMap(([, entries]) => entries || [])
        .filter(entry => entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.'))
        .map(entry => entry.address);
      addresses = [...new Set(addresses)];
    } catch {
      throw new Error('Détection réseau impossible. Définis VITE_API_URL=http://IP_DU_PC:3001/api dans apps/mobile/.env.');
    }
    if (addresses.length !== 1) {
      throw new Error(`Adresse API ambiguë ou indisponible (${addresses.join(', ') || 'aucun réseau'}). Définis VITE_API_URL=http://IP_DU_PC:3001/api dans apps/mobile/.env, ou utilise une API HTTPS hébergée.`);
    }
    apiUrl = `http://${addresses[0]}:3001/api`;
  }
  if (command === 'build') {
    const url = new URL(apiUrl!);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('VITE_API_URL doit utiliser HTTP ou HTTPS.');
    console.info(`[Moodly] API embarquée : ${apiUrl}`);
  }
  return {
    plugins: [react()],
    ...(command === 'build' ? { define: { 'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl) } } : {}),
    server: { host: '0.0.0.0', proxy: { '/api': { target: env.MOODLY_DEV_API_TARGET || 'http://127.0.0.1:3001', changeOrigin: true } } },
    build: { rollupOptions: { output: { manualChunks: { charts: ['recharts'], dates: ['date-fns'] } } } }
  };
});
