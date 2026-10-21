import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = { appId: 'dev.moodly.app', appName: 'Moodly', webDir: 'dist', server: { androidScheme: 'http', cleartext: true }, android: { allowMixedContent: true } };
export default config;
