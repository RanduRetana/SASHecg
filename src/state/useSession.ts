import { useMemo, useRef, useState } from 'react'
import { anonymizeDocument, type ProcessedPage, type ProcessProgress } from '@/core/anonymize'
import { createBrowserCanvas } from '@/core/browserCanvas'
import { downloadBytes } from '@/core/download'
import { createExportLock } from '@/core/exportLock'
import {
  DEFAULT_REDACTION,
  rectForPage,
  rectsEqual,
  roundRect,
  type NormalizedRect,
} from '@/core/geometry'
import { zipFileName } from '@/core/naming'
import { openPdf, pagesDiffer, PdfOpenError, readPageInfos, type OpenedPdf, type PageInfo } from '@/core/pdfDocument'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { createSamplePdf } from '@/core/samplePdf'
import { browserMemoryPressure } from '@/core/scale'
import { buildZip } from '@/core/zip'

export type Stage = 0 | 1 | 2 | 3
export type Scope = 'all' | 'pages'

export type DocumentInfo = {
  name: string
  size: number
  pageCount: number
  pages: PageInfo[]
  mixed: boolean
}

export type PreviewPage = {
  index: number
  filename: string
  pdfBytes: Uint8Array
  previewUrl: string
  widthPt: number
  heightPt: number
  dpi: number
  rect: NormalizedRect
  exception: boolean
  warning?: string
}

export type PageFailure = { index: number; message: string }

type Slot = PreviewPage | null

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function toPreview(page: ProcessedPage): PreviewPage {
  const bytes = page.previewBytes ?? new Uint8Array()
  const copy = new Uint8Array(bytes)
  const previewUrl = URL.createObjectURL(new Blob([copy.buffer], { type: 'image/jpeg' }))
  return {
    index: page.index,
    filename: page.filename,
    pdfBytes: page.pdfBytes,
    previewUrl,
    widthPt: page.widthPt,
    heightPt: page.heightPt,
    dpi: page.dpi,
    rect: page.rect,
    exception: page.exception,
    ...(page.warning ? { warning: page.warning } : {}),
  }
}

function revoke(slots: Slot[]) {
  for (const slot of slots) {
    if (slot) URL.revokeObjectURL(slot.previewUrl)
  }
}

export function useSession() {
  const openedRef = useRef<OpenedPdf | null>(null)
  const pendingFile = useRef<File | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const running = useRef<Promise<void> | null>(null)
  const exportLock = useRef(createExportLock())
  const anchor = useRef(0)

  const [stage, setStage] = useState<Stage>(0)
  const [doc, setDoc] = useState<DocumentInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [passwordNeeded, setPasswordNeeded] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [defaultRect, setDefaultRect] = useState<NormalizedRect>(DEFAULT_REDACTION)
  const [overrides, setOverrides] = useState<Record<number, NormalizedRect>>({})
  const [scope, setScope] = useState<Scope>('all')
  const [selection, setSelection] = useState<number[]>([])
  const [editorPage, setEditorPage] = useState(0)
  const [slots, setSlots] = useState<Slot[]>([])
  const [failures, setFailures] = useState<PageFailure[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState<ProcessProgress | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [active, setActive] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportName, setExportName] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)

  const stale = useMemo(() => {
    return slots.some((slot) => {
      if (!slot) return false
      return !rectsEqual(slot.rect, rectForPage(slot.index, defaultRect, overrides).rect)
    })
  }, [slots, defaultRect, overrides])

  const readyToExport = Boolean(
    doc &&
      !processing &&
      !stale &&
      failures.length === 0 &&
      slots.length === doc.pageCount &&
      slots.every((slot) => slot),
  )

  const maxStage: Stage = !doc ? 0 : !hasRun ? 1 : readyToExport ? 3 : 2

  const activeRect = scope === 'all' ? defaultRect : (overrides[editorPage] ?? defaultRect)
  const targets = scope === 'all' ? [] : selection.length > 0 ? selection : [editorPage]

  const status = processing
    ? `Procesando, ${progress?.done ?? 0} de ${progress?.total ?? 0} páginas.`
    : exportName
      ? `Se descargó ${exportName}.`
      : fileError

  async function settleRunning() {
    abortRef.current?.abort()
    await running.current
  }

  async function replaceDocument(file: File, passwordValue?: string) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const opened = await openPdf(bytes, passwordValue)
    const pages = await readPageInfos(opened.pdf)
    if (pages.length === 0) {
      await opened.destroy()
      throw new PdfOpenError('invalid', 'El PDF no tiene páginas.')
    }
    await settleRunning()
    const previous = openedRef.current
    openedRef.current = opened
    setPdf(opened.pdf)
    if (previous) queueMicrotask(() => void previous.destroy())
    setSlots((current) => {
      revoke(current)
      return Array.from({ length: pages.length }, () => null)
    })
    setDoc({
      name: file.name,
      size: file.size,
      pageCount: pages.length,
      pages,
      mixed: pagesDiffer(pages),
    })
    setDefaultRect(DEFAULT_REDACTION)
    setOverrides({})
    setFailures([])
    setCancelled(false)
    setHasRun(false)
    setSelection([])
    setScope('all')
    setEditorPage(0)
    setActive(0)
    setPassword('')
    setPasswordNeeded(false)
    setPasswordError(null)
    setFileError(null)
    setExportError(null)
    setExportName(null)
    setProgress(null)
    pendingFile.current = null
    setStage(1)
  }

  function reportFileError(message: string) {
    setFileError(message)
    setPasswordNeeded(false)
    setPasswordError(null)
  }

  async function loadFile(file: File, passwordValue?: string) {
    if (!isPdf(file)) {
      setFileError('Elige un archivo PDF.')
      setPasswordNeeded(false)
      return
    }
    setLoading(true)
    setFileError(null)
    setPasswordError(null)
    try {
      await replaceDocument(file, passwordValue)
    } catch (error) {
      if (error instanceof PdfOpenError && (error.kind === 'password' || error.kind === 'invalid-password')) {
        pendingFile.current = file
        setPasswordNeeded(true)
        setPasswordError(error.kind === 'invalid-password' ? error.message : null)
        setFileError(null)
      } else if (error instanceof PdfOpenError) {
        setFileError(error.message)
        setPasswordNeeded(false)
      } else {
        setFileError('No se pudo abrir el archivo.')
        setPasswordNeeded(false)
      }
    } finally {
      setLoading(false)
    }
  }

  async function submitPassword() {
    const file = pendingFile.current
    if (!file) return
    await loadFile(file, password)
  }

  async function loadSample() {
    setLoading(true)
    setFileError(null)
    try {
      const bytes = await createSamplePdf()
      const copy = new Uint8Array(bytes)
      const file = new File([copy.buffer], 'ejemplo-sintetico.pdf', { type: 'application/pdf' })
      await replaceDocument(file)
    } catch {
      setFileError('No se pudo crear el PDF de ejemplo.')
    } finally {
      setLoading(false)
    }
  }

  function updateRect(rect: NormalizedRect) {
    const next = roundRect(rect)
    if (scope === 'all') {
      setDefaultRect(next)
      return
    }
    const pages = selection.length > 0 ? selection : [editorPage]
    setOverrides((current) => {
      const copy = { ...current }
      for (const index of pages) copy[index] = next
      return copy
    })
  }

  function clearExceptions(indices: number[]) {
    setOverrides((current) => {
      const copy = { ...current }
      for (const index of indices) delete copy[index]
      return copy
    })
  }

  function editPages(indices: number[]) {
    if (indices.length === 0 || !doc) return
    const page = indices[0] ?? 0
    setSelection(indices)
    setEditorPage(page)
    setScope('pages')
    setStage(1)
  }

  async function process(indices?: number[]) {
    const opened = openedRef.current
    if (!opened || !doc || processing) return
    const controller = new AbortController()
    abortRef.current = controller
    setProcessing(true)
    setCancelled(false)
    setExportName(null)
    setExportError(null)
    setProgress({ done: 0, total: indices?.length ?? doc.pageCount, pageIndex: indices?.[0] ?? 0, dpi: 0 })

    const job = (async () => {
      let result
      try {
        result = await anonymizeDocument(opened.pdf, {
        pageCount: doc.pageCount,
        defaultRect,
        overrides,
        ...(indices ? { indices } : {}),
        signal: controller.signal,
        canvasFactory: createBrowserCanvas,
        previews: true,
        memoryPressure: browserMemoryPressure,
        onProgress: setProgress,
      })
      } catch {
        setFileError('El proceso se detuvo por un error inesperado.')
        setHasRun(true)
        return
      }
      setSlots((current) => {
        const base: Slot[] = indices ? current.slice() : Array.from({ length: doc.pageCount }, () => null)
        while (base.length < doc.pageCount) base.push(null)
        if (indices) {
          for (const page of result.pages) {
            const previous = current[page.index]
            if (previous) URL.revokeObjectURL(previous.previewUrl)
          }
        } else {
          revoke(current)
        }
        for (const page of result.pages) base[page.index] = toPreview(page)
        return base
      })
      setFailures((current) => {
        if (!indices) return result.failures
        const retried = new Set(indices)
        return [...current.filter((failure) => !retried.has(failure.index)), ...result.failures]
      })
      setCancelled(result.cancelled)
      setHasRun(true)
      setStage(2)
      if (indices && indices[0] !== undefined) setActive(indices[0])
    })()

    running.current = job
    try {
      await job
    } finally {
      if (running.current === job) running.current = null
      abortRef.current = null
      setProcessing(false)
    }
  }

  async function exportZip() {
    if (!doc || !readyToExport) return
    setExportError(null)
    const name = await exportLock.current.run(async () => {
      setExporting(true)
      try {
        const files = slots.flatMap((slot) => (slot ? [{ name: slot.filename, data: slot.pdfBytes }] : []))
        const zip = await buildZip(files)
        const filename = zipFileName(doc.name)
        downloadBytes(zip, filename, 'application/zip')
        return filename
      } catch {
        setExportError('No se pudo crear el ZIP. Vuelve a intentarlo.')
        return null
      } finally {
        setExporting(false)
      }
    })
    if (name) setExportName(name)
  }

  async function reset() {
    await settleRunning()
    const previous = openedRef.current
    openedRef.current = null
    setPdf(null)
    if (previous) queueMicrotask(() => void previous.destroy())
    pendingFile.current = null
    setSlots((current) => {
      revoke(current)
      return []
    })
    setDoc(null)
    setStage(0)
    setDefaultRect(DEFAULT_REDACTION)
    setOverrides({})
    setFailures([])
    setCancelled(false)
    setHasRun(false)
    setProcessing(false)
    setProgress(null)
    setPassword('')
    setPasswordNeeded(false)
    setPasswordError(null)
    setFileError(null)
    setExportError(null)
    setExportName(null)
    setSelection([])
    setScope('all')
    setEditorPage(0)
    setActive(0)
    setConfirmReset(false)
    setLoading(false)
  }

  function cancel() {
    abortRef.current?.abort()
  }

  function changeScope(next: Scope) {
    setScope(next)
    if (next === 'pages' && selection.length === 0) setSelection([editorPage])
  }

  function stepEditor(delta: number) {
    if (!doc) return
    if (scope === 'pages' && selection.length > 1) {
      const ordered = [...selection].sort((a, b) => a - b)
      const pos = Math.max(0, ordered.indexOf(editorPage))
      const next = ordered[(pos + delta + ordered.length) % ordered.length]
      if (next !== undefined) setEditorPage(next)
      return
    }
    const next = Math.min(doc.pageCount - 1, Math.max(0, editorPage + delta))
    setEditorPage(next)
    if (scope === 'pages') setSelection([next])
  }

  function goTo(next: number) {
    if (next < 0 || next > maxStage) return
    setStage(next as Stage)
  }

  function toggleSelected(index: number, shift: boolean) {
    setActive(index)
    if (shift) {
      const start = Math.min(anchor.current, index)
      const end = Math.max(anchor.current, index)
      const range: number[] = []
      for (let page = start; page <= end; page++) range.push(page)
      setSelection(range)
      return
    }
    anchor.current = index
    setSelection((current) => (current.includes(index) ? current.filter((page) => page !== index) : [...current, index]))
  }

  const warnings = slots.flatMap((slot) => (slot?.warning ? [slot.warning] : []))

  return {
    stage,
    maxStage,
    goTo,
    doc,
    pdf,
    loading,
    fileError,
    passwordNeeded,
    passwordError,
    password,
    setPassword,
    loadFile,
    reportFileError,
    submitPassword,
    loadSample,
    defaultRect,
    overrides,
    scope,
    setScope: changeScope,
    stepEditor,
    selection,
    setSelection,
    editorPage,
    setEditorPage,
    activeRect,
    targets,
    updateRect,
    clearExceptions,
    editPages,
    slots,
    failures,
    processing,
    progress,
    hasRun,
    cancel,
    cancelled,
    stale,
    readyToExport,
    active,
    setActive,
    toggleSelected,
    process,
    exporting,
    exportError,
    exportName,
    exportZip,
    confirmReset,
    setConfirmReset,
    reset,
    warnings,
    status,
  }
}

export type Session = ReturnType<typeof useSession>
