import { createCanvas } from '@napi-rs/canvas'
import { expect, test } from 'bun:test'
import { anonymizeDocument } from './anonymize'
import type { CanvasFactory } from './flatten'
import { DEFAULT_REDACTION } from './geometry'
import { extractText, openPdf } from './pdfDocument'
import { PRACTICE_ID, PRACTICE_PATIENT, createSamplePdf } from './samplePdf'

const canvasFactory: CanvasFactory = (width, height) =>
  createCanvas(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height))) as unknown as HTMLCanvasElement

test('the practice report is one realistic page and the default area removes the invented identifiers', async () => {
  const bytes = await createSamplePdf()
  const opened = await openPdf(bytes)
  expect(opened.pdf.numPages).toBe(1)
  const page = await opened.pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  expect(viewport.width).toBeGreaterThan(viewport.height)
  const text = await extractText(opened.pdf, 1)
  expect(text).toContain(PRACTICE_PATIENT)
  expect(text).toContain(PRACTICE_ID)
  expect(text).toContain('Sinus rhythm')
  expect(text).toContain('Incomplete right bundle branch block')
  expect(text).toContain('57 bpm')
  expect(text).toContain('Synthetic practice report')
  expect(text).toContain('Page 1 of 1')
  expect(text).toContain('25 mm/s, 10 mm/mV')
  expect(text.toUpperCase()).not.toContain('SCHILLER')

  const before = await render(opened.pdf)
  const headerDark = darkFraction(before, 0, 0, 0.28, 0.14)
  expect(headerDark).toBeLessThan(0.2)

  const result = await anonymizeDocument(opened.pdf, {
    pageCount: 1,
    defaultRect: DEFAULT_REDACTION,
    targetDpi: 72,
    previews: false,
    canvasFactory,
  })
  expect(result.failures).toEqual([])
  const out = await openPdf(result.pages[0]!.pdfBytes)
  const hidden = await extractText(out.pdf, 1)
  expect(hidden).not.toContain(PRACTICE_PATIENT)
  expect(hidden).not.toContain(PRACTICE_ID)
  const after = await render(out.pdf)
  const masked = after.context.getImageData(
    Math.round(0.12 * after.width),
    Math.round(0.06 * after.height),
    1,
    1,
  ).data
  expect([masked[0], masked[1], masked[2], masked[3]]).toEqual([17, 17, 17, 255])
  const trace = after.context.getImageData(Math.round(after.width * 0.45), Math.round(after.height * 0.55), 1, 1).data
  const traceIsMask = trace[0] === 17 && trace[1] === 17 && trace[2] === 17
  expect(traceIsMask).toBe(false)
  page.cleanup()
  await opened.destroy()
  await out.destroy()
}, 60000)

async function render(pdf: Awaited<ReturnType<typeof openPdf>>['pdf']) {
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const context = canvas.getContext('2d')
  await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise
  page.cleanup()
  return { context, width: canvas.width, height: canvas.height }
}

function darkFraction(
  image: { context: ReturnType<ReturnType<typeof createCanvas>['getContext']>; width: number; height: number },
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const left = Math.round(x0 * image.width)
  const top = Math.round(y0 * image.height)
  const width = Math.max(1, Math.round((x1 - x0) * image.width))
  const height = Math.max(1, Math.round((y1 - y0) * image.height))
  const data = image.context.getImageData(left, top, width, height).data
  let dark = 0
  const pixels = width * height
  for (let index = 0; index < data.length; index += 4) {
    if (data[index] < 40 && data[index + 1] < 40 && data[index + 2] < 40) dark += 1
  }
  return dark / pixels
}
