const path = require('path')

// Learn more https://docs.expo.io/guides/customizing-metro
const { getDatadogExpoConfig } = require('@datadog/mobile-react-native/metro')
const { withStorybook } = require('@storybook/react-native/metro/withStorybook')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDatadogExpoConfig(__dirname)

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'crypto' && platform !== 'web') {
    // when importing crypto, resolve to react-native-quick-crypto
    return context.resolveRequest(context, 'react-native-quick-crypto', platform)
  }

  // Native-only screenshot/record protection has no web implementation —
  // stub it so `expo start --web` bundles (runtime no-op in the browser).
  if (moduleName === 'react-native-capture-protection' && platform === 'web') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'metro-stubs/react-native-capture-protection.js'),
    }
  }

  // Native-only paketi bez web implementacije — univerzalni no-op proxy
  // (TurboModule/codegen speci pucaju pri importu u browseru).
  const WEB_NOOP_MODULES = [
    '@notifee/react-native',
    'react-native-share',
    'react-native-keychain',
    'react-native-device-crypto',
    'react-native-device-info',
    'react-native-ble-plx',
    'react-native-permissions',
    'react-native-quick-base64',
  ]
  if (
    platform === 'web' &&
    (moduleName.startsWith('@react-native-firebase/') ||
      moduleName.startsWith('@ledgerhq/device-transport-kit-react-native-ble') ||
      WEB_NOOP_MODULES.includes(moduleName))
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'metro-stubs/anything-noop.js'),
    }
  }

  // freeRASP je native-only (runtime self-protection) — no-op na webu.
  if (platform === 'web' && moduleName === 'freerasp-react-native') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'metro-stubs/freerasp-react-native.js'),
    }
  }

  // Pager view je native (Fabric) komponenta bez web implementacije.
  if (platform === 'web' && moduleName === 'react-native-pager-view') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'metro-stubs/react-native-pager-view.js'),
    }
  }

  // quick-crypto je native-only (Nitro) — web preview ga zamjenjuje
  // @noble/hashes implementacijom pokrivenih API-ja.
  if (platform === 'web' && moduleName === 'react-native-quick-crypto') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'metro-stubs/react-native-quick-crypto.js'),
    }
  }

  // VisionCamera throwa pri importu na webu ("does not work on web").
  if (platform === 'web' && moduleName === 'react-native-vision-camera') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'metro-stubs/react-native-vision-camera.js'),
    }
  }

  // Datadog RUM je native-only (TurboModule spec puca pri importu na webu).
  if (platform === 'web' && (moduleName === 'expo-datadog' || moduleName.startsWith('@datadog/mobile-react-native'))) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'metro-stubs/expo-datadog.js'),
    }
  }

  // Native-only side-effect module (Firebase/notifee background handlers) —
  // touches native modules at import time; the web preview doesn't need it.
  if (platform === 'web' && moduleName.includes('services/notifications/backgroundHandlers')) {
    return { type: 'empty' }
  }

  // RN dev-only internals that don't resolve when bundling for web.
  if (platform === 'web' && moduleName.includes('devsupport/rndevtools/ReactDevToolsSettingsManager')) {
    return { type: 'empty' }
  }

  // viem's barrel export pulls in ws (Node.js WebSocket server) which requires
  // http, stream, events, etc. On React Native, isows uses the native WebSocket
  // global instead, so ws never executes. Shim the entire ws package to empty.
  if (moduleName === 'ws') {
    return { type: 'empty' }
  }

  return context.resolveRequest(context, moduleName, platform)
}

// Web preview only (WEB_PREVIEW=1 npx expo start --web): react-native's
// InitializeCore is native-only (touches NativeModules eagerly) but expo's
// default config lists it as a run-before-main-module for every platform.
// react-native-web needs no core setup; expo/src/winter + metro-runtime stay.
if (process.env.WEB_PREVIEW === '1') {
  const originalRunBeforeMain = config.serializer.getModulesRunBeforeMainModule
  config.serializer.getModulesRunBeforeMainModule = (...args) =>
    (originalRunBeforeMain ? originalRunBeforeMain(...args) : []).filter(
      (modulePath) => !modulePath.includes(path.join('react-native', 'Libraries', 'Core', 'InitializeCore')),
    )
}

if (process.env.RN_SRC_EXT) {
  config.resolver.sourceExts = [...process.env.RN_SRC_EXT.split(','), ...config.resolver.sourceExts]
}

module.exports = withStorybook(config, {
  enabled: process.env.STORYBOOK_ENABLED === 'true',
  configPath: path.resolve(__dirname, './.storybook'),
})
