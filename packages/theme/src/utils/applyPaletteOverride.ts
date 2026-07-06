import type { ColorPalette } from '../palettes/types'

/**
 * A flat map of dot-path palette keys to color values, e.g.
 * `{ 'primary.main': '#0A84FF', 'text.primary': '#101010' }`.
 * This is the shape brand manifests use for `theme.light` / `theme.dark`.
 */
export type PaletteOverride = Record<string, string>

/**
 * Return a copy of `palette` with the given dot-path overrides applied.
 *
 * - Pure: the input palette is never mutated.
 * - Unknown paths (or paths that don't point at a color leaf) are ignored so a
 *   stale manifest key can never crash app startup; the manifest schema is the
 *   place to validate keys.
 * - An empty/undefined override returns the palette unchanged (same reference),
 *   which keeps default builds byte-identical.
 */
export function applyPaletteOverride(palette: ColorPalette, override?: PaletteOverride): ColorPalette {
  if (!override || Object.keys(override).length === 0) {
    return palette
  }

  // Palettes are plain string leaves, so JSON cloning is exact (and avoids
  // relying on structuredClone, which older Hermes runtimes lack).
  const result = JSON.parse(JSON.stringify(palette)) as Record<string, unknown>

  Object.entries(override).forEach(([path, value]) => {
    const keys = path.split('.')
    const leafKey = keys[keys.length - 1]
    const parent = keys
      .slice(0, -1)
      .reduce<
        Record<string, unknown> | undefined
      >((node, key) => (node && typeof node[key] === 'object' && node[key] !== null ? (node[key] as Record<string, unknown>) : undefined), result)

    if (parent && typeof parent[leafKey] === 'string') {
      parent[leafKey] = value
    }
  })

  return result as unknown as ColorPalette
}
