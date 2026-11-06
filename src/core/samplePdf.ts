import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'

/** Invented identity. The default upper-left rectangle is meant to cover this block. */
export const PRACTICE_PATIENT = 'AVERY QUILL'
export const PRACTICE_ID = 'FIC-00421'

const PAGE_W = 792
const PAGE_H = 612
const INK = rgb(0.1, 0.1, 0.12)
const MUTED = rgb(0.28, 0.28, 0.3)
const GRID = rgb(1, 0.8, 0.82)
const GRID_BOLD = rgb(0.86, 0.45, 0.5)
const MM = 72 / 25.4
const MV = 10 * MM
const MS = (25 / 1000) * MM

type Shape = { p: number; q: number; r: number; s: number; rp: number; t: number }

const SHAPES: Record<string, Shape> = {
  I: { p: 0.12, q: -0.08, r: 0.85, s: -0.22, rp: 0, t: 0.22 },
  II: { p: 0.18, q: -0.04, r: 1.2, s: -0.18, rp: 0, t: 0.34 },
  III: { p: 0.08, q: 0.02, r: 0.42, s: -0.28, rp: 0, t: 0.1 },
  aVR: { p: -0.14, q: 0.06, r: -0.95, s: 0.12, rp: 0, t: -0.22 },
  aVL: { p: 0.07, q: -0.1, r: 0.38, s: -0.12, rp: 0, t: 0.08 },
  aVF: { p: 0.15, q: -0.02, r: 0.9, s: -0.2, rp: 0, t: 0.28 },
  V1: { p: 0.05, q: 0, r: 0.22, s: -0.85, rp: 0.48, t: -0.18 },
  V2: { p: 0.07, q: 0, r: 0.48, s: -1.15, rp: 0.12, t: 0.22 },
  V3: { p: 0.1, q: -0.02, r: 0.95, s: -0.45, rp: 0, t: 0.38 },
  V4: { p: 0.12, q: -0.04, r: 1.35, s: -0.22, rp: 0, t: 0.42 },
  V5: { p: 0.12, q: -0.05, r: 1.15, s: -0.18, rp: 0, t: 0.34 },
  V6: { p: 0.1, q: -0.06, r: 0.82, s: -0.32, rp: 0, t: 0.24 },
}

const COLUMNS = [
  ['I', 'II', 'III'],
  ['aVR', 'aVL', 'aVF'],
  ['V1', 'V2', 'V3'],
  ['V4', 'V5', 'V6'],
] as const

/** One landscape practice page in a familiar 12-lead layout. No redaction bars. */
export async function createSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('Synthetic practice report')
  doc.setAuthor('SASHecg')
  doc.setSubject('Invented data for redaction practice')
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([PAGE_W, PAGE_H])

  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(1, 1, 1) })
  drawGrid(page, 24, 40, PAGE_W - 24, 508)
  drawHeader(page, font, bold)
  drawLeads(page, font)
  drawFooter(page, font)

  return new Uint8Array(await doc.save())
}

function drawHeader(page: PDFPage, font: PDFFont, bold: PDFFont) {
  const left = [
    PRACTICE_PATIENT,
    `ID ${PRACTICE_ID}`,
    'Visit ID  V-2026-1184',
    'Room  4B',
    'Order ID  ORD-88021',
    'Provider  Dr. N. Hale',
    'Ref. phys.  Dr. L. Moss',
    'Device  Harbor Trace HT-10',
    'Medication  None recorded',
    'Remark  Practice only',
  ]
  left.forEach((line, index) => {
    page.drawText(line, {
      x: 16,
      y: 596 - index * 8.2,
      size: index === 0 ? 8 : 6.5,
      font: index === 0 ? bold : font,
      color: INK,
    })
  })

  const measures: [string, string][] = [
    ['HR', '57 bpm'],
    ['RR', '1057 ms'],
    ['P', '96 ms'],
    ['PR', '127 ms'],
    ['QRS', '105 ms'],
    ['QT', '451 ms'],
    ['QTcB', '439 ms'],
  ]
  measures.forEach(([label, value], index) => {
    const y = 590 - index * 9
    page.drawText(label, { x: 268, y, size: 7, font, color: MUTED })
    page.drawText(value, { x: 300, y, size: 7.5, font: label === 'HR' ? bold : font, color: INK })
  })
  const axes: [string, string][] = [
    ['P axis', '70°'],
    ['QRS axis', '75°'],
    ['T axis', '59°'],
  ]
  axes.forEach(([label, value], index) => {
    const y = 572 - index * 11
    page.drawText(label, { x: 390, y, size: 7, font, color: MUTED })
    page.drawText(value, { x: 438, y, size: 7.5, font: bold, color: INK })
  })

  const diagnosis = [
    'Sinus rhythm',
    'Normal electrical axis',
    'Incomplete right bundle branch block',
    'Otherwise normal ECG',
    'Unconfirmed report',
  ]
  diagnosis.forEach((line, index) => {
    page.drawText(line, {
      x: 520,
      y: 590 - index * 11,
      size: 7.5,
      font: index === 0 ? bold : font,
      color: INK,
    })
  })

  page.drawText('HARBOR TRACE', { x: 680, y: 592, size: 8, font: bold, color: INK })
  page.drawText('HT-10 practice unit', { x: 680, y: 582, size: 6, font, color: MUTED })
}

function drawLeads(page: PDFPage, font: PDFFont) {
  page.drawText('Otherwise normal', {
    x: 352,
    y: 512,
    size: 8,
    font,
    color: INK,
  })

  const baselines = [452, 348, 244]
  COLUMNS.forEach((column, columnIndex) => {
    const x = 36 + columnIndex * 186
    column.forEach((lead, row) => {
      const baseline = baselines[row] ?? 244
      page.drawText(lead, { x, y: baseline + 34, size: 7, font, color: INK })
      drawTrace(page, x, baseline, 2500, SHAPES[lead] ?? SHAPES.II, columnIndex * 2500)
    })
  })

  page.drawText('Sequential', { x: 368, y: 176, size: 8, font, color: INK })
  page.drawText('II', { x: 36, y: 150, size: 7, font, color: INK })
  drawTrace(page, 36, 104, 10200, SHAPES.II, 0)
}

function drawFooter(page: PDFPage, font: PDFFont) {
  page.drawText('25 mm/s, 10 mm/mV', { x: 28, y: 22, size: 7, font, color: INK })
  page.drawText('Synthetic practice report', { x: 318, y: 22, size: 7, font, color: MUTED })
  page.drawText('LP 40Hz, AC 50Hz', { x: 560, y: 22, size: 7, font, color: INK })
  page.drawText('Page 1 of 1', { x: 710, y: 22, size: 7, font, color: INK })
}

function drawGrid(page: PDFPage, x0: number, y0: number, x1: number, y1: number) {
  const step = MM
  let index = 0
  for (let x = x0; x <= x1; x += step) {
    const major = index % 5 === 0
    page.drawLine({
      start: { x, y: y0 },
      end: { x, y: y1 },
      thickness: major ? 0.6 : 0.22,
      color: major ? GRID_BOLD : GRID,
    })
    index += 1
  }
  index = 0
  for (let y = y0; y <= y1; y += step) {
    const major = index % 5 === 0
    page.drawLine({
      start: { x: x0, y },
      end: { x: x1, y },
      thickness: major ? 0.6 : 0.22,
      color: major ? GRID_BOLD : GRID,
    })
    index += 1
  }
}

function drawTrace(page: PDFPage, originX: number, baseline: number, durationMs: number, shape: Shape, timeOffset: number) {
  const stepMs = 4
  const samples: number[] = []
  for (let t = 0; t <= durationMs; t += stepMs) {
    const cal = calibrationMv(t)
    const mv = cal === null ? sampleMv(timeOffset + Math.max(0, t - 200), shape) : cal
    samples.push(mv * MV)
  }
  const dx = stepMs * MS
  let path = `M 0 ${(-samples[0]).toFixed(2)}`
  for (let index = 1; index < samples.length; index++) {
    path += ` L ${(index * dx).toFixed(2)} ${(-samples[index]).toFixed(2)}`
  }
  page.drawSvgPath(path, {
    x: originX,
    y: baseline,
    borderColor: INK,
    borderWidth: 0.7,
  })
}

function calibrationMv(tMs: number): number | null {
  if (tMs >= 200) return null
  if (tMs < 40 || tMs > 160) return 0
  return 1
}

function sampleMv(tMs: number, shape: Shape): number {
  const rr = 1057
  const phase = ((tMs % rr) + rr) % rr
  const bump = (center: number, width: number, gain: number) => gain * Math.exp(-((phase - center) ** 2) / (2 * width * width))
  const wander = 0.012 * Math.sin(tMs / 740)
  const grain = ((Math.sin(tMs * 0.37) * 1000) % 1 - 0.5) * 0.01
  return (
    bump(70, 16, shape.p) +
    bump(198, 6, shape.q) +
    bump(220, 7, shape.r) +
    bump(246, 9, shape.s) +
    bump(278, 11, shape.rp) +
    bump(560, 48, shape.t) +
    wander +
    grain
  )
}
