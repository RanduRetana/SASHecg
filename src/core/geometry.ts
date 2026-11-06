/** A rectangle in page space. Origin is the top-left of the visual page. Values are fractions of the page. */
export type NormalizedRect = {
  x: number
  y: number
  width: number
  height: number
}

export type PixelRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ClientBounds = {
  left: number
  top: number
  width: number
  height: number
}

export type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/**
 * Upper-left block on a typical one-page ECG report: identifiers sit in the
 * header, clear of the trace and of the measurements on the right.
 */
export const DEFAULT_REDACTION: NormalizedRect = {
  x: 0,
  y: 0,
  width: 0.3,
  height: 0.155,
}

export const MIN_RECT_EDGE = 0.02

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function clampRect(rect: NormalizedRect): NormalizedRect {
  let width = Number.isFinite(rect.width) ? rect.width : MIN_RECT_EDGE
  let height = Number.isFinite(rect.height) ? rect.height : MIN_RECT_EDGE
  width = Math.min(Math.max(width, MIN_RECT_EDGE), 1)
  height = Math.min(Math.max(height, MIN_RECT_EDGE), 1)

  let x = Number.isFinite(rect.x) ? rect.x : 0
  let y = Number.isFinite(rect.y) ? rect.y : 0
  if (x < 0) x = 0
  if (y < 0) y = 0
  if (x + width > 1) x = 1 - width
  if (y + height > 1) y = 1 - height
  if (x < 0) {
    x = 0
    width = 1
  }
  if (y < 0) {
    y = 0
    height = 1
  }
  return { x, y, width, height }
}

export function roundRect(rect: NormalizedRect, places = 4): NormalizedRect {
  const factor = 10 ** places
  const round = (value: number) => Math.round(value * factor) / factor
  return clampRect({
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
  })
}

export function rectsEqual(a: NormalizedRect, b: NormalizedRect, epsilon = 0.0001): boolean {
  return (
    Math.abs(a.x - b.x) <= epsilon &&
    Math.abs(a.y - b.y) <= epsilon &&
    Math.abs(a.width - b.width) <= epsilon &&
    Math.abs(a.height - b.height) <= epsilon
  )
}

/**
 * Map a normalized rectangle onto a bitmap. Rounding uses the outer edges so
 * the mask never leaves a fractional pixel of the source showing inside.
 */
export function normalizedToPixels(rect: NormalizedRect, pixelWidth: number, pixelHeight: number): PixelRect {
  const safe = clampRect(rect)
  const width = Math.max(0, pixelWidth)
  const height = Math.max(0, pixelHeight)
  const x = clampPixel(Math.round(safe.x * width), width)
  const y = clampPixel(Math.round(safe.y * height), height)
  const right = clampPixel(Math.round((safe.x + safe.width) * width), width)
  const bottom = clampPixel(Math.round((safe.y + safe.height) * height), height)
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  }
}

/**
 * Convert a pointer position to page fractions. `bounds` must be the CSS box
 * of the rendered page (getBoundingClientRect), not the canvas bitmap size.
 * A 1200×900 bitmap shown at 400×300 CSS pixels still maps a pointer in the
 * middle of that box to (0.5, 0.5).
 */
export function pointerToNormalized(clientX: number, clientY: number, bounds: ClientBounds): { x: number; y: number } {
  const width = bounds.width > 0 ? bounds.width : 1
  const height = bounds.height > 0 ? bounds.height : 1
  return {
    x: clamp01((clientX - bounds.left) / width),
    y: clamp01((clientY - bounds.top) / height),
  }
}

export function applyHandle(rect: NormalizedRect, handle: Handle, dx: number, dy: number): NormalizedRect {
  if (handle === 'move') {
    return clampRect({
      x: rect.x + dx,
      y: rect.y + dy,
      width: rect.width,
      height: rect.height,
    })
  }

  let left = rect.x
  let top = rect.y
  let right = rect.x + rect.width
  let bottom = rect.y + rect.height

  if (handle.includes('w')) left += dx
  if (handle.includes('e')) right += dx
  if (handle.includes('n')) top += dy
  if (handle.includes('s')) bottom += dy

  if (right < left) {
    const swap = left
    left = right
    right = swap
  }
  if (bottom < top) {
    const swap = top
    top = bottom
    bottom = swap
  }

  return clampRect({
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  })
}

export function rectForPage(
  index: number,
  fallback: NormalizedRect,
  overrides?: Readonly<Record<number, NormalizedRect>>,
): { rect: NormalizedRect; exception: boolean } {
  const custom = overrides?.[index]
  if (custom) return { rect: clampRect(custom), exception: true }
  return { rect: clampRect(fallback), exception: false }
}

function clampPixel(value: number, limit: number): number {
  if (value < 0) return 0
  if (value > limit) return limit
  return value
}
