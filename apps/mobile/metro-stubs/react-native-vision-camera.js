/**
 * Web stub: react-native-vision-camera nema web implementaciju (throwa pri
 * importu). Kamera/skener u web previewu nisu dostupni — komponenta renderira
 * null, permissioni su trajno "denied", hookovi su no-op.
 */
const React = require('react')

const CameraComponent = () => null
CameraComponent.getCameraPermissionStatus = () => 'denied'
CameraComponent.requestCameraPermission = () => Promise.resolve('denied')
CameraComponent.getAvailableCameraDevices = () => []

module.exports = {
  Camera: CameraComponent,
  useCameraDevice: () => undefined,
  useCameraDevices: () => [],
  useCodeScanner: (options) => options,
  useCameraPermission: () => ({ hasPermission: false, requestPermission: () => Promise.resolve(false) }),
}
