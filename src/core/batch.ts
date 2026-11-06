import type { NormalizedRect } from './geometry'
import { anonymizeDocument, type AnonymizeResult, type PageFailure, type ProcessProgress, type ProcessedPage } from './anonymize'
import type { CanvasFactory } from './flatten'
import { openPdf } from './pdfDocument'

export type BatchInput = {
  load: () => Promise<Uint8Array>
  pages: { localIndex: number; globalIndex: number; filename: string }[]
}

/** Open one source at a time, anonymize its pages, then release that document. */
export async function anonymizeBatch(
  inputs: BatchInput[],
  options: {
    defaultRect: NormalizedRect
    overrides?: Readonly<Record<number, NormalizedRect>>
    signal?: AbortSignal
    canvasFactory: CanvasFactory
    targetDpi?: number
    previews?: boolean
    memoryPressure?: () => boolean
    onProgress?: (progress: ProcessProgress & { label?: string }) => void
    labelFor?: (globalIndex: number) => string | undefined
  },
): Promise<AnonymizeResult> {
  const pages: ProcessedPage[] = []
  const failures: PageFailure[] = []
  const total = inputs.reduce((sum, input) => sum + input.pages.length, 0)
  let completed = 0

  for (const input of inputs) {
    if (options.signal?.aborted) return { pages, failures, cancelled: true }
    const data = await input.load()
    const opened = await openPdf(data)
    try {
      const filenames: Record<number, string> = {}
      const globalIndexes: Record<number, number> = {}
      const overrides: Record<number, NormalizedRect> = {}
      for (const page of input.pages) {
        filenames[page.localIndex] = page.filename
        globalIndexes[page.localIndex] = page.globalIndex
        const custom = options.overrides?.[page.globalIndex]
        if (custom) overrides[page.localIndex] = custom
      }
      const result = await anonymizeDocument(opened.pdf, {
        pageCount: input.pages.length,
        defaultRect: options.defaultRect,
        overrides,
        indices: input.pages.map((page) => page.localIndex),
        filenames,
        globalIndexes,
        ...(options.targetDpi !== undefined ? { targetDpi: options.targetDpi } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
        canvasFactory: options.canvasFactory,
        ...(options.previews !== undefined ? { previews: options.previews } : {}),
        ...(options.memoryPressure ? { memoryPressure: options.memoryPressure } : {}),
        onProgress: (progress) => {
          options.onProgress?.({
            ...progress,
            done: completed + progress.done,
            total,
            ...(options.labelFor?.(progress.pageIndex) ? { label: options.labelFor(progress.pageIndex) } : {}),
          })
        },
      })
      pages.push(...result.pages)
      failures.push(...result.failures)
      completed += input.pages.length
      if (result.cancelled) return { pages, failures, cancelled: true }
    } finally {
      await opened.destroy()
    }
  }

  return { pages, failures, cancelled: false }
}
