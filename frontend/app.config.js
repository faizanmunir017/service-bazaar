/**
 * Expo config — display name, icons, and build-time API URL.
 * For EAS/APK builds set EXPO_PUBLIC_BACKEND_URL (see eas.env.example).
 */
export default {
  expo: {
    name: 'Service Bazaar',
    slug: 'frontend',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#4f46e5',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.faizanmunir017.servicebazaar',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#4f46e5',
      },
      edgeToEdgeEnabled: false,
      softwareKeyboardLayoutMode: 'resize',
      usesCleartextTraffic: false,
      package: 'com.faizanmunir017.servicebazaar',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || null,
      eas: {
        projectId: '92afd774-2271-46e3-9f6f-dd5641bef79f',
      },
    },
  },
};
