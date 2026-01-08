import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.realworth.app',
  appName: 'RealWorth',
  webDir: 'out',
  server: {
    // Load from production URL - the app wraps the live website
    url: 'https://realworth.ai',
    cleartext: false,
    // Allow navigation to auth providers without opening external browser
    allowNavigation: [
      'realworth.ai',
      '*.realworth.ai',
      'accounts.google.com',
      '*.google.com',
      'appleid.apple.com',
      '*.apple.com',
      '*.supabase.co',
    ],
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#F8FAFC',
    // Keep all navigation in the WebView
    allowsLinkPreview: false,
  },
  plugins: {
    Camera: {
      // Camera permissions for iOS
      permissions: ['camera', 'photos'],
    },
  },
};

export default config;
