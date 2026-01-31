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
    SocialLogin: {
      google: {
        iOSClientId: '811570590708-5vkm4h9mtofqoi6e38rflim0vk8t5um5.apps.googleusercontent.com',
        iOSServerClientId: '811570590708-flberffl49r3oufn7qebb16ht06rm548.apps.googleusercontent.com',
        mode: 'online',
      },
    },
  },
};

export default config;
