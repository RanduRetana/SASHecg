import { expect, test } from 'bun:test'
import { chooseRenderScale } from './scale'

test('una página carta se queda cerca de 220 ppp', () => {
  const choice = chooseRenderScale(612, 792)
  expect(choice.dpi).toBeGreaterThan(200)
  expect(choice.dpi).toBeLessThan(230)
  expect(choice.capped).toBe(false)
  expect(612 * choice.scale * 792 * choice.scale).toBeLessThanOrEqual(8_000_000)
})

test('una página enorme baja de 200 ppp en lugar de reservar un bitmap gigante', () => {
  const choice = chooseRenderScale(2000, 2000)
  expect(choice.capped).toBe(true)
  expect(choice.dpi).toBeLessThan(200)
  expect(2000 * choice.scale * 2000 * choice.scale).toBeLessThanOrEqual(8_000_000 + 1)
})

test('la presión de memoria usa un objetivo más bajo', () => {
  const calm = chooseRenderScale(612, 792)
  const pressured = chooseRenderScale(612, 792, { memoryPressure: true })
  expect(pressured.dpi).toBeLessThan(calm.dpi)
  expect(pressured.dpi).toBeLessThanOrEqual(160.1)
})

test('un objetivo de prueba a 72 ppp no se marca como recorte clínico', () => {
  const choice = chooseRenderScale(240, 320, { targetDpi: 72 })
  expect(choice.dpi).toBeCloseTo(72)
  expect(choice.capped).toBe(false)
})
