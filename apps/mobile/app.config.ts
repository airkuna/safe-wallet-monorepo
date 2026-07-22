import { ExpoConfig } from 'expo/config'
import { resolveBrand } from './brand/resolveBrand'

const IS_DEV = process.env.APP_VARIANT === 'development'

// White-label identity, resolved from the active brand manifest (defaults to `safe`).
// See brand/README.md.
const brand = resolveBrand({ isDev: IS_DEV })

const appleDevTeamId = brand.ios.appleTeamId

// SPKI (public key) pins, matched against any cert in the validated chain. Per AWS guidance for
// ACM-managed certs, pin all Amazon Trust Services roots — leaf and intermediate certs rotate
// (ACM re-keys the leaf ~every 6 months and picks one of several intermediates at random):
// https://docs.aws.amazon.com/acm/latest/userguide/acm-bestpractices.html#best-practices-pinning
// Covers RSA (CA 1/2), ECDSA (CA 3/4), and the Starfield cross-sign path on older trust stores.
const amazonRootCAs = [
  '++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=', // 🌳 Amazon Root CA 1 (RSA 2048, valid until: Jan 17 2038)
  'f0KW/FtqTjs108NpYj42SrGvOB2PpxIVM8nWxjPqJGE=', // 🌳 Amazon Root CA 2 (RSA 4096, valid until: May 26 2040)
  'NqvDJlas/GRcYbcWE8S/IceH9cq77kg0jVhZeAPXq8k=', // 🌳 Amazon Root CA 3 (ECDSA 256, valid until: May 26 2040)
  '9+ze1cZgR9KO1kZrVDxA4HQ6voHRCSVNz4RdTCx4U8U=', // 🌳 Amazon Root CA 4 (ECDSA 384, valid until: May 26 2040)
  'KwccWaCgrnaw6tsrrSO61FgLacNgG2MMLq8GE6+oP5I=', // 🌳 Starfield Services Root CA G2 (valid until: Dec 31 2037)
  'jZNVWOajyJYzAUj/32oawKW/uhq0RUUTWjs3bJoaMI0=', // 🌳 Amazon RSA 2048 Root EU M1 (valid until: Nov 14 2042, pending trust-store inclusion)
  'lWWQdyVGS+C/9EsSMvhe6GKpoNmduXG6IDRKr0FDHVg=', // 🌳 Amazon ECDSA 256 Root EU M1 (valid until: Nov 14 2042, pending trust-store inclusion)
  'eY/hCVfoxaCHQgHK8J1e9LLiQSxHv5kZSVZstULTrz8=', // 🌳 Amazon ECDSA 384 Root EU M1 (valid until: Nov 14 2042, pending trust-store inclusion)
]

const sslPinningDomains: Record<string, string[]> = {
  'safe-client.staging.5afe.dev': amazonRootCAs,
  'safe-client.safe.global': amazonRootCAs,
  // Brand gateways get their pins from the manifest; without an entry here the
  // native layer serves the host unpinned.
  ...brand.backend?.pinnedCertificates,
}

// A brand gateway outside the pin list is a silent transport-security
// downgrade — surface it at config-eval time, on every build.
for (const gatewayUrl of [brand.backend?.cgwBaseUrl, brand.backend?.cgwStagingBaseUrl]) {
  if (!gatewayUrl) {
    continue
  }
  const host = new URL(gatewayUrl).hostname
  if (!(host in sslPinningDomains)) {
    console.warn(
      `[brand] WARNING: gateway host ${host} is not certificate-pinned — ` +
        `add backend.pinnedCertificates["${host}"] (SPKI base64 pins) to the brand manifest.`,
    )
  }
}

const name = brand.appName

// OTA (EAS Update) — only for brands that opt in via the manifest. `fingerprint` keeps
// updates from reaching binaries whose native layer differs; code signing is mandatory
// (wallet — the app must reject any update not signed with our private key).
const otaConfig: Pick<ExpoConfig, 'runtimeVersion' | 'updates'> = brand.updates
  ? {
      runtimeVersion: { policy: 'fingerprint' },
      updates: {
        url: brand.updates.url ?? `https://u.expo.dev/${brand.easProjectId}`,
        enabled: true,
        checkAutomatically: 'ON_LOAD',
        // Never block launch on the network; a downloaded update applies on next launch.
        fallbackToCacheTimeout: 0,
        // Channel for LOCAL (non-EAS) builds; EAS Build overwrites this with the
        // profile's `channel` from eas.json at build time.
        requestHeaders: { 'expo-channel-name': IS_DEV ? 'development' : 'production' },
        codeSigningCertificate: brand.updates.codeSigningCertificatePath,
        codeSigningMetadata: { keyid: 'main', alg: 'rsa-v1_5-sha256' },
      },
    }
  : {}

const config: ExpoConfig = {
  ...otaConfig,
  name: name,
  slug: brand.slug,
  owner: brand.owner,
  version: '1.0.15',
  extra: {
    storybookEnabled: process.env.STORYBOOK_ENABLED,
    eas: {
      projectId: brand.easProjectId,
    },
    // Runtime branding payload, read via `src/custom/brand`.
    brand: {
      id: brand.id,
      name: name,
      theme: brand.theme,
      backend: brand.backend,
      features: brand.features,
      identity: brand.identity,
      events: brand.events,
      donations: brand.donations,
    },
  },
  orientation: 'portrait',
  icon: brand.assets.icon,
  // Primary scheme must match the WalletConnect registry native link (and SAFE_WALLET_METADATA.redirect); `wc` keeps raw wc: links.
  scheme: brand.scheme,
  userInterfaceStyle: 'automatic',
  ios: {
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      NSFaceIDUsageDescription: 'Enabling Face ID allows you to create/access secure keys.',
      UIBackgroundModes: ['remote-notification'],
      NSBluetoothPeripheralUsageDescription: 'Allow Bluetooth access to connect to Ledger devices.',
      // Read by react-native-mmkv v4 to place the MMKV store in the App Group container.
      // Renaming this key to anything else (e.g. v3's `AppGroup`) strands data in the old location on upgrade.
      AppGroupIdentifier: brand.ios.appGroupIdentifier,
      // https://github.com/expo/expo/issues/39739
      UIDesignRequiresCompatibility: true,
      // https://github.com/react-native-share/react-native-share/issues/1669
      NSPhotoLibraryUsageDescription:
        'This permission is required by third party libraries, but not used in the app. If you ever get prompted for it, deny it & contact support.',
      LSApplicationQueriesSchemes: [
        'metamask',
        'rabby',
        'ledger',
        'coinbase',
        'okx',
        'trust',
        'tokenpocket',
        'phantom',
        'rainbow',
        'zerion',
        'frame',
        'onekey',
        'bitget',
        'safepal',
        'bybit',
      ],
    },
    supportsTablet: false,
    appleTeamId: appleDevTeamId,
    bundleIdentifier: brand.ios.bundleIdentifier,
    // Conditional spread: brands without the field (stock safe) keep a
    // byte-identical config output.
    ...(brand.ios.associatedDomains ? { associatedDomains: brand.ios.associatedDomains } : {}),
    entitlements: {
      'aps-environment': brand.ios.apsEnvMode,
      'com.apple.security.application-groups': [brand.ios.appGroupIdentifier],
    },
    googleServicesFile: IS_DEV ? process.env.GOOGLE_SERVICES_PLIST_DEV : process.env.GOOGLE_SERVICES_PLIST,
  },
  android: {
    package: brand.android.package,
    // Conditional spread: brands without the field (stock safe) keep a
    // byte-identical config output.
    ...(brand.android.appLinks
      ? {
          intentFilters: [
            {
              action: 'VIEW',
              autoVerify: true,
              data: brand.android.appLinks.map(({ host, pathPrefix }) => ({ scheme: 'https', host, pathPrefix })),
              category: ['BROWSABLE', 'DEFAULT'],
            },
          ],
        }
      : {}),
    googleServicesFile: IS_DEV ? process.env.GOOGLE_SERVICES_JSON_DEV : process.env.GOOGLE_SERVICES_JSON,
    adaptiveIcon: {
      foregroundImage: brand.assets.androidAdaptiveIcon.foregroundImage,
      backgroundImage: brand.assets.androidAdaptiveIcon.backgroundImage,
      monochromeImage: brand.assets.androidAdaptiveIcon.monochromeImage,
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.WAKE_LOCK',
    ],
    allowBackup: false,
  },
  web: {
    bundler: 'metro',
    // 'single' (SPA): static SSR render in Node hits native-module bridges
    // (__fbBatchedBridgeConfig) — web is a dev/preview target, not a release.
    output: 'single',
    favicon: brand.assets.favicon,
  },
  plugins: [
    [
      'expo-datadog',
      {
        errorTracking: {
          iosDsyms: !!process.env.EAS_BUILD,
          iosSourcemaps: !!process.env.EAS_BUILD,
          androidSourcemaps: !!process.env.EAS_BUILD,
          androidProguardMappingFiles: !!process.env.EAS_BUILD,
        },
      },
    ],
    [
      'react-native-ble-plx',
      {
        isBackgroundEnabled: false,
        modes: ['central'],
        bluetoothAlwaysPermission: `Allow ${name} to connect to bluetooth devices`,
      },
    ],
    ['./expo-plugins/withNotificationIcons.js'],
    [
      './expo-plugins/ssl-pinning/withSSLPinning.js',
      {
        domains: sslPinningDomains,
      },
    ],
    'expo-router',
    [
      'expo-font',
      {
        fonts: ['./assets/fonts/safe-icons/safe-icons.ttf'],
      },
    ],
    [
      'expo-splash-screen',
      {
        image: brand.assets.splash.image,
        backgroundColor: brand.assets.splash.backgroundColor,
        dark: {
          image: brand.assets.splash.imageDark,
          backgroundColor: brand.assets.splash.backgroundColorDark,
        },
      },
    ],
    [
      'react-native-vision-camera',
      {
        cameraPermissionText: 'Safe{Mobile} needs access to your Camera to scan QR Codes.',
        enableCodeScanner: true,
        enableLocation: false,
      },
    ],
    ['./expo-plugins/withDrawableAssets.js', './assets/android/drawable'],
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
          forceStaticLinking: ['RNFBApp'],
        },
        android: {
          minSdkVersion: 34,
          extraMavenRepos: ['../../../../node_modules/@notifee/react-native/android/libs'],
        },
      },
    ],
    '@react-native-firebase/app',
    '@react-native-firebase/messaging',
    '@react-native-firebase/crashlytics',
    [
      'react-native-share',
      {
        ios: ['fb', 'twitter', 'tiktoksharesdk'],
        android: ['com.facebook.katana', 'com.twitter.android', 'com.zhiliaoapp.musically'],
        enableBase64ShareAndroid: true,
      },
    ],
    '@react-native-community/datetimepicker',
    'expo-image',
    'expo-task-manager',
    'expo-web-browser',
    [
      '@safe-global/notification-service-ios',
      {
        iosDeploymentTarget: '15.1',
        apsEnvMode: brand.ios.apsEnvMode,
        appleDevTeamId: appleDevTeamId,
        appGroupIdentifier: brand.ios.appGroupIdentifier,
      },
    ],
    [
      'react-native-capture-protection',
      {
        captureType: 'restrictedCapture',
      },
    ],
    [
      'react-native-permissions',
      {
        iosPermissions: ['Bluetooth'],
      },
    ],
    './queries.js',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
}

export default config
