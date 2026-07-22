export type DoctorLevel = 'ok' | 'warn' | 'error'

export interface DoctorCheck {
  /** Stable check key, e.g. `manifest`, `assets:icon`, `firebase:android:prod`. */
  id: string
  level: DoctorLevel
  message: string
}

export interface DoctorResult {
  /** True when no check is at `error` level (warnings allowed). */
  ok: boolean
  checks: DoctorCheck[]
}

export interface DiagnoseOptions {
  /** App root the brand package is validated against; defaults to `apps/mobile`. */
  appDir?: string
  /** Environment consulted for `GOOGLE_SERVICES_*` overrides; defaults to `process.env`. */
  env?: Record<string, string | undefined>
  /** Downgrade missing local Firebase files to warnings (CI: EAS file env vars). */
  allowRemoteFirebase?: boolean
}

export declare function diagnose(brandId: string, options?: DiagnoseOptions): DoctorResult

export declare function report(brandId: string, result: DoctorResult): string

export declare function firebaseFileNames(brandId: string): {
  androidProd: string
  androidDev: string
  iosProd: string
  iosDev: string
}
