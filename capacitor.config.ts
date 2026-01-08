import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.realworth.app',
  appName: 'RealWorth',
  webDir: 'out',
  server: {
    // Load from production URL - the app wraps the live website
    url: 'https://realworth.ai',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#F8FAFC',
  },
  plugins: {
    Camera: {
      // Camera permissions for iOS
      permissions: ['camera', 'photos'],
    },
  },
};

export default config;
