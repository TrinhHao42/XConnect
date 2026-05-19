import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'xconnect_frontend',
  webDir: 'out',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '500191810465-60pu0ka68c7ndge7ev4bijriol3aqoqm.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
