import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.avoska.plus',
  appName: 'Авоська+',
  webDir: 'out',
  plugins: {
    App: {
      hardwareBackButton: true
    }
  }
};

export default config;
