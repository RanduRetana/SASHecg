import { PDFDocument, rgb, StandardFonts, type PDFPage } from 'pdf-lib'

const PHI = 'FICTITIOUS PATIENT'
const SAFE = 'SAMPLE RHYTHM'

/** Three letter pages of an obviously fake ECG, for trying the tool without a real report. */
export async function createSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('Synthetic SASHecg document')
  doc.setAuthor('SASHecg')
  doc.setSubject('NO REAL DATA')
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  for (let index = 0; index < 3; index++) {
    const page = doc.addPage([612, 792])
    page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: rgb(1, 1, 1) })
    page.drawRectangle({ x: 0, y: 748, width: 612, height: 44, color: rgb(0.988, 0.839, 0.976) })
    page.drawText('SASHecg', { x: 500, y: 764, size: 14, font: bold, color: rgb(0.298, 0.208, 0.435) })
    page.drawText('SYNTHETIC DOCUMENT', { x: 430, y: 752, size: 8, font, color: rgb(0.298, 0.208, 0.435) })

    page.drawText(PHI, { x: 28, y: 766, size: 12, font: bold, color: rgb(0.08, 0.09, 0.09) })
    page.drawText(`ID DEMO-000${index + 1}`, { x: 28, y: 750, size: 10, font, color: rgb(0.15, 0.16, 0.16) })
    page.drawText('FICTITIOUS ROOM', { x: 28, y: 736, size: 9, font, color: rgb(0.2, 0.22, 0.22) })

    page.drawText(SAFE, { x: 250, y: 766, size: 11, font: bold, color: rgb(0.298, 0.208, 0.435) })
    page.drawText(`Page ${index + 1} of 3`, { x: 250, y: 750, size: 9, font, color: rgb(0.3, 0.34, 0.33) })

    drawGrid(page)
    drawWave(page, 96 + index * 18)
    page.drawText('NO REAL DATA. This trace is a drawing, not an electrocardiogram.', {
      x: 36,
      y: 48,
      size: 9,
      font,
      color: rgb(0.35, 0.25, 0.25),
    })
  }

  return new Uint8Array(await doc.save())
}

function drawGrid(page: PDFPage) {
  const line = rgb(0.808, 0.686, 1)
  for (let x = 36; x <= 576; x += 12) {
    page.drawLine({ start: { x, y: 80 }, end: { x, y: 700 }, thickness: 0.3, color: line })
  }
  for (let y = 80; y <= 700; y += 12) {
    page.drawLine({ start: { x: 36, y }, end: { x: 576, y }, thickness: 0.3, color: line })
  }
}

function drawWave(page: PDFPage, baseline: number) {
  const ink = rgb(0.298, 0.208, 0.435)
  let x = 48
  while (x < 560) {
    const next = x + 26
    page.drawLine({ start: { x, y: baseline }, end: { x: x + 8, y: baseline }, thickness: 1.3, color: ink })
    page.drawLine({ start: { x: x + 8, y: baseline }, end: { x: x + 12, y: baseline + 8 }, thickness: 1.3, color: ink })
    page.drawLine({ start: { x: x + 12, y: baseline + 8 }, end: { x: x + 15, y: baseline - 22 }, thickness: 1.4, color: ink })
    page.drawLine({ start: { x: x + 15, y: baseline - 22 }, end: { x: x + 19, y: baseline + 16 }, thickness: 1.4, color: ink })
    page.drawLine({ start: { x: x + 19, y: baseline + 16 }, end: { x: next, y: baseline }, thickness: 1.3, color: ink })
    x = next
  }
}
