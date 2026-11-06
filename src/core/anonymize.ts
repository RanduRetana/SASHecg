import type { PDFDocumentProxy } from 'pdfjs-dist'
import { rectForPage, type NormalizedRect } from './geometry'
import { flattenPage, ProcessCancelled, type CanvasFactory } from './flatten'
import { pageFileName } from './naming'

export type ProcessedPage = {
  index: number
  filename: string
  pdfBytes: Uint8Array
  previewBytes: Uint8Array | null
  widthPt: number
  heightPt: number
  dpi: number
  rect: NormalizedRect
  exception: boolean
  warning?: string
}

export type PageFailure = {
  index: number
  message: string
}

export type ProcessProgress = {
  done: number
  total: number
  pageIndex: number
  dpi: number
  warning?: string
}

export type AnonymizeResult = {
  pages: ProcessedPage[]
  failures: PageFailure[]
  cancelled: boolean
}

export async function anonymizeDocument(
  pdf: PDFDocumentProxy,
  options: {
    pageCount: number
    defaultRect: NormalizedRect
    overrides?: Readonly<Record<number, NormalizedRect>>
    indices?: number[]
    targetDpi?: number
    maxPixels?: number
    signal?: AbortSignal
    canvasFactory: CanvasFactory
    previews?: boolean
    memoryPressure?: () => boolean
    onProgress?: (progress: ProcessProgress) => void
  },
): Promise<AnonymizeResult> {
  const indices = options.indices ?? Array.from({ length: options.pageCount }, (_, index) => index)
  const pages: ProcessedPage[] = []
  const failures: PageFailure[] = []
  let memoryPressure = false

  for (let cursor = 0; cursor < indices.length; cursor++) {
    if (options.signal?.aborted) {
      return { pages, failures, cancelled: true }
    }
    const index = indices[cursor]
    if (index === undefined) continue
    const { rect, exception } = rectForPage(index, options.defaultRect, options.overrides)
    if (!memoryPressure && options.memoryPressure?.()) memoryPressure = true

    try {
      const flat = await flattenPage({
        pdf,
        pageIndex: index,
        rect,
        canvasFactory: options.canvasFactory,
        targetDpi: options.targetDpi,
        maxPixels: options.maxPixels,
        memoryPressure,
        previews: options.previews,
        signal: options.signal,
      })
      const warning = flat.capped
        ? `Page ${index + 1} was rasterized at ${Math.round(flat.dpi)} dpi to stay within memory. The usual target is 200–300 dpi.`
        : undefined
      pages.push({
        index,
        filename: pageFileName(index + 1, options.pageCount),
        pdfBytes: flat.pdfBytes,
        previewBytes: flat.previewBytes,
        widthPt: flat.widthPt,
        heightPt: flat.heightPt,
        dpi: flat.dpi,
        rect,
        exception,
        ...(warning ? { warning } : {}),
      })
      options.onProgress?.({
        done: cursor + 1,
        total: indices.length,
        pageIndex: index,
        dpi: flat.dpi,
        ...(warning ? { warning } : {}),
      })
    } catch (error) {
      if (error instanceof ProcessCancelled || options.signal?.aborted) {
        return { pages, failures, cancelled: true }
      }
      failures.push({
        index,
        message: error instanceof Error ? error.message : 'Could not anonymize the page.',
      })
      options.onProgress?.({
        done: cursor + 1,
        total: indices.length,
        pageIndex: index,
        dpi: 0,
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return { pages, failures, cancelled: false }
}
