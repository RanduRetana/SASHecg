import { expect, test } from 'bun:test'
import {
  applyHandle,
  clampRect,
  normalizedToPixels,
  pointerToNormalized,
  rectForPage,
  rectsEqual,
  DEFAULT_REDACTION,
} from './geometry'

test('la normalización recorta el rectángulo al interior de la página', () => {
  expect(clampRect({ x: -0.2, y: 0.1, width: 0.5, height: 0.2 })).toEqual({
    x: 0,
    y: 0.1,
    width: 0.5,
    height: 0.2,
  })
  expect(clampRect({ x: 0.8, y: 0.9, width: 0.5, height: 0.4 })).toEqual({
    x: 0.5,
    y: 0.6,
    width: 0.5,
    height: 0.4,
  })
  expect(clampRect({ x: 0.2, y: 0.2, width: 0.001, height: 2 })).toEqual({
    x: 0.2,
    y: 0,
    width: 0.02,
    height: 1,
  })
  expect(clampRect({ x: Number.NaN, y: 0, width: 0.2, height: 0.2 }).x).toBe(0)
})

test('los píxeles salen de las fracciones de la página, no del tamaño en pantalla', () => {
  expect(normalizedToPixels({ x: 0, y: 0, width: 0.3, height: 0.155 }, 1000, 2000)).toEqual({
    x: 0,
    y: 0,
    width: 300,
    height: 310,
  })
  expect(normalizedToPixels({ x: 0.25, y: 0.5, width: 0.5, height: 0.25 }, 101, 101).x).toBe(25)
})

test('el puntero usa el recuadro CSS aunque el bitmap sea más grande', () => {
  const displayed = { left: 40, top: 80, width: 400, height: 300 }
  expect(pointerToNormalized(240, 230, displayed)).toEqual({ x: 0.5, y: 0.5 })
  expect(pointerToNormalized(0, 0, displayed)).toEqual({ x: 0, y: 0 })
  expect(pointerToNormalized(9999, 9999, displayed)).toEqual({ x: 1, y: 1 })
  expect(pointerToNormalized(40, 80, { left: 40, top: 80, width: 0, height: 0 })).toEqual({ x: 0, y: 0 })
})

test('arrastrar y redimensionar respetan los bordes', () => {
  const start = { x: 0.2, y: 0.2, width: 0.4, height: 0.3 }
  expect(rectsEqual(applyHandle(start, 'move', 0.1, -0.05), { x: 0.3, y: 0.15, width: 0.4, height: 0.3 })).toBe(true)
  expect(applyHandle(start, 'move', -1, 0).x).toBe(0)
  expect(applyHandle(start, 'e', 0.1, 0).width).toBeCloseTo(0.5)
  expect(rectsEqual(applyHandle(start, 'n', 0, 0.1), { x: 0.2, y: 0.3, width: 0.4, height: 0.2 })).toBe(true)
  expect(applyHandle(start, 'w', 0.5, 0).width).toBeGreaterThanOrEqual(0.02)
  const flipped = applyHandle(start, 'se', -0.5, -0.4)
  expect(flipped.width).toBeGreaterThanOrEqual(0.02)
  expect(flipped.height).toBeGreaterThanOrEqual(0.02)
  expect(flipped.x).toBeGreaterThanOrEqual(0)
  expect(flipped.y).toBeGreaterThanOrEqual(0)
})

test('una excepción sustituye el área común solo en esa página', () => {
  const shared = rectForPage(0, DEFAULT_REDACTION, { 2: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 } })
  const custom = rectForPage(2, DEFAULT_REDACTION, { 2: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 } })
  expect(shared.exception).toBe(false)
  expect(rectsEqual(shared.rect, DEFAULT_REDACTION)).toBe(true)
  expect(custom.exception).toBe(true)
  expect(custom.rect).toEqual({ x: 0.4, y: 0.4, width: 0.2, height: 0.2 })
})
