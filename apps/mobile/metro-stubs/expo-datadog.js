/**
 * Web stub: expo-datadog / @datadog/mobile-react-native su native-only (RUM,
 * TurboModule speci pucaju pri importu u browseru) — web preview ne šalje
 * telemetriju, sve je no-op. Pokriva sve named importe iz appa.
 */
const React = require('react')

const noopAsync = () => Promise.resolve()

const enumProxy = new Proxy({}, { get: (_target, prop) => String(prop) })

class DatadogProviderConfiguration {
  constructor() {}
}

module.exports = {
  DatadogProvider: ({ children }) => React.createElement(React.Fragment, null, children),
  DatadogProviderConfiguration,
  PropagatorType: enumProxy,
  SdkVerbosity: enumProxy,
  TrackingConsent: enumProxy,
  UploadFrequency: enumProxy,
  BatchSize: enumProxy,
  ErrorSource: enumProxy,
  DdSdkReactNative: {
    initialize: noopAsync,
    setTrackingConsent: noopAsync,
    setUser: noopAsync,
    setAttributes: noopAsync,
    telemetryDebug: noopAsync,
  },
  DdRum: {
    addError: noopAsync,
    addAction: noopAsync,
    startView: noopAsync,
    stopView: noopAsync,
    addTiming: noopAsync,
    addFeatureFlagEvaluation: noopAsync,
  },
  DdLogs: {
    debug: noopAsync,
    info: noopAsync,
    warn: noopAsync,
    error: noopAsync,
  },
  DdTrace: {
    startSpan: () => Promise.resolve('span'),
    finishSpan: noopAsync,
  },
}
