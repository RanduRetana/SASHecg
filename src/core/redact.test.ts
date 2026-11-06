import { createCanvas } from '@napi-rs/canvas'
import { expect, test } from 'bun:test'
import { applyOpaqueRect, burnRedaction, MASK_COLOR } from './redact'

test('el rectángulo opaco sustituye los píxeles y no deja alfa', () => {
  const width = 10
  const height = 8
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255
    pixels[i + 1] = 0
    pixels[i + 2] = 0
    pixels[i + 3] = 128
  }

  applyOpaqueRect(pixels, width, height, { x: 0, y: 0, width: 0.5, height: 1 })

  const at = (x: number, y: number) => {
    const index = (y * width + x) * 4
    return [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]]
  }

  expect(at(0, 0)).toEqual([MASK_COLOR.r, MASK_COLOR.g, MASK_COLOR.b, 255])
  expect(at(4, 7)).toEqual([MASK_COLOR.r, MASK_COLOR.g, MASK_COLOR.b, 255])
  expect(at(5, 0)).toEqual([255, 0, 0, 128])
  expect(at(9, 4)).toEqual([255, 0, 0, 128])
})

test('quemar la máscara en un lienzo reemplaza la misma zona', () => {
  const canvas = createCanvas(20, 10)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0000ff'
  ctx.fillRect(0, 0, 20, 10)
  burnRedaction(ctx as unknown as CanvasRenderingContext2D, 20, 10, { x: 0, y: 0.25, width: 0.5, height: 0.5 })

  const masked = ctx.getImageData(2, 4, 1, 1).data
  const kept = ctx.getImageData(16, 2, 1, 1).data
  expect([masked[0], masked[1], masked[2], masked[3]]).toEqual([17, 17, 17, 255])
  expect([kept[0], kept[1], kept[2], kept[3]]).toEqual([0, 0, 255, 255])
})
