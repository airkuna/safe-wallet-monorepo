/**
 * Web stub: react-native-capture-protection je native-only (screenshot/record
 * zaštita) — u browseru je no-op da `expo start --web` uopće bundla.
 */
const noop = () => Promise.resolve()

module.exports = {
  CaptureProtection: {
    prevent: noop,
    allow: noop,
  },
}
