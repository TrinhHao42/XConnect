import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xconnect.app',
  appName: 'Xconnect',
  webDir: 'out',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      androidClientId: '974068152881-vu4u144u4ve4fpk0p8m9pena8f8lia2k.apps.googleusercontent.com', // ← Thêm dòng này
      serverClientId: '500191810465-60pu0ka68c7ndge7ev4bijriol3aqoqm.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
