import { createCanvas } from '@napi-rs/canvas'
import { expect, test } from 'bun:test'
import { PDFDocument, rgb } from 'pdf-lib'
import { anonymizeBatch } from './batch'
import type { CanvasFactory } from './flatten'
import { planOutputNames } from './naming'
import { openPdf } from './pdfDocument'
import { buildZip, readZip } from './zip'

const canvasFactory: CanvasFactory = (width, height) =>
  createCanvas(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height))) as unknown as HTMLCanvasElement

test('many small PDFs share one rectangle and keep distinct source names', async () => {
  const inputs: { name: string; data: Uint8Array }[] = []
  for (let index = 0; index < 24; index++) {
    const wide = index % 5 === 0
    inputs.push({
      name: index === 7 ? 'ward.pdf' : `file-${String(index + 1).padStart(2, '0')}.pdf`,
      data: await markedPdf(wide ? [200, 120] : [120, 180]),
    })
  }
  inputs.push({ name: 'ward.pdf', data: await markedPdf([120, 180]) })

  const plan = planOutputNames(inputs.map((input) => ({ name: input.name, pageCount: 1 })))
  const result = await anonymizeBatch(
    inputs.map((input, index) => ({
      load: async () => input.data,
      pages: [{ localIndex: 0, globalIndex: index, filename: plan[index]!.names[0]! }],
    })),
    {
      defaultRect: { x: 0, y: 0, width: 0.45, height: 0.35 },
      targetDpi: 72,
      previews: false,
      canvasFactory,
    },
  )

  expect(result.cancelled).toBe(false)
  expect(result.failures).toEqual([])
  expect(result.pages).toHaveLength(25)
  expect(result.pages.map((page) => page.filename)).toEqual(plan.flatMap((file) => file.names))
  expect(new Set(result.pages.map((page) => page.filename)).size).toBe(25)

  const zip = await buildZip(result.pages.map((page) => ({ name: page.filename, data: page.pdfBytes })))
  const files = readZip(zip)
  expect(Object.keys(files)).toHaveLength(25)

  const first = await openPdf(files[result.pages[0]!.filename]!)
  const last = await openPdf(files[result.pages[24]!.filename]!)
  for (const opened of [first, last]) {
    const page = await opened.pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise
    const masked = canvas.getContext('2d').getImageData(4, 4, 1, 1).data
    expect([masked[0], masked[1], masked[2], masked[3]]).toEqual([17, 17, 17, 255])
    page.cleanup()
    await opened.destroy()
  }
}, 60000)

async function markedPdf(size: [number, number]) {
  const doc = await PDFDocument.create()
  const page = doc.addPage(size)
  const [width, height] = size
  page.drawRectangle({ x: 0, y: height - 40, width: Math.min(50, width), height: 40, color: rgb(1, 0, 0) })
  page.drawRectangle({ x: width / 2 - 12, y: height / 2 - 12, width: 24, height: 24, color: rgb(0, 0.2, 1) })
  return new Uint8Array(await doc.save())
}
