import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { applyHandle, type Handle, type NormalizedRect } from '@/core/geometry'
import { Spinner } from '@/components/ui/spinner'

const HANDLES: { id: Exclude<Handle, 'move'>; label: string; className: string }[] = [
  { id: 'nw', label: 'Top-left corner', className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
  { id: 'n', label: 'Top edge', className: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize' },
  { id: 'ne', label: 'Top-right corner', className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
  { id: 'e', label: 'Right edge', className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
  { id: 'se', label: 'Bottom-right corner', className: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' },
  { id: 's', label: 'Bottom edge', className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize' },
  { id: 'sw', label: 'Bottom-left corner', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
  { id: 'w', label: 'Left edge', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
]

type Drag = {
  handle: Handle
  pointerId: number
  startX: number
  startY: number
  origin: NormalizedRect
  width: number
  height: number
}

export function RedactionEditor({
  pdf,
  pageIndex,
  widthPt,
  heightPt,
  rect,
  onChange,
}: {
  pdf: PDFDocumentProxy
  pageIndex: number
  widthPt: number
  heightPt: number
  rect: NormalizedRect
  onChange: (rect: NormalizedRect) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const rectRef = useRef(rect)
  const [box, setBox] = useState<{ width: number; height: number } | null>(null)
  const [rendering, setRendering] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    rectRef.current = rect
  }, [rect])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const token = { n: 0, timer: 0, task: null as { cancel: () => void; promise: Promise<void> } | null }

    const draw = async () => {
      const gen = ++token.n
      token.task?.cancel()
      setRendering(true)
      setError(null)
      try {
        const page = await pdf.getPage(pageIndex + 1)
        try {
        if (gen !== token.n) return
        const maxW = Math.max(wrap.clientWidth, 1)
        const maxH = Math.min(window.innerHeight * 0.62, 840)
        const fit = Math.min(maxW / widthPt, maxH / heightPt)
        const cssW = widthPt * fit
        const cssH = heightPt * fit
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: fit * dpr })
        const offscreen = document.createElement('canvas')
        offscreen.width = Math.max(1, Math.ceil(viewport.width))
        offscreen.height = Math.max(1, Math.ceil(viewport.height))
        const renderTask = page.render({ canvas: offscreen, viewport, background: '#ffffff' })
        token.task = renderTask
        await renderTask.promise
        if (gen !== token.n) return
        canvas.width = offscreen.width
        canvas.height = offscreen.height
        canvas.style.width = `${cssW}px`
        canvas.style.height = `${cssH}px`
        canvas.getContext('2d')?.drawImage(offscreen, 0, 0)
        offscreen.width = 1
        offscreen.height = 1
        setBox({ width: cssW, height: cssH })
        setRendering(false)
        } finally {
          page.cleanup()
        }
      } catch (caught) {
        if (gen !== token.n) return
        const name = caught instanceof Error ? caught.name : ''
        if (name === 'RenderingCancelledException') return
        setRendering(false)
        setError('Could not draw this page.')
      }
    }

    const schedule = () => {
      window.clearTimeout(token.timer)
      token.timer = window.setTimeout(() => void draw(), 40)
    }
    schedule()
    const observer = new ResizeObserver(schedule)
    observer.observe(wrap)
    return () => {
      token.n += 1
      token.task?.cancel()
      observer.disconnect()
      window.clearTimeout(token.timer)
    }
  }, [pdf, pageIndex, widthPt, heightPt])

  const begin = (event: PointerEvent<HTMLElement>, handle: Handle) => {
    const frame = frameRef.current
    if (!frame) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const bounds = frame.getBoundingClientRect()
    dragRef.current = {
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: rectRef.current,
      width: bounds.width || 1,
      height: bounds.height || 1,
    }
  }

  const move = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = (event.clientX - drag.startX) / drag.width
    const dy = (event.clientY - drag.startY) / drag.height
    onChange(applyHandle(drag.origin, drag.handle, dx, dy))
  }

  const end = (event: PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('input, textarea')) return
    const step = event.shiftKey ? 0.01 : 0.002
    let dx = 0
    let dy = 0
    if (event.key === 'ArrowLeft') dx = -step
    else if (event.key === 'ArrowRight') dx = step
    else if (event.key === 'ArrowUp') dy = -step
    else if (event.key === 'ArrowDown') dy = step
    else return
    event.preventDefault()
    onChange(applyHandle(rect, event.altKey ? 'se' : 'move', dx, dy))
  }

  return (
    <div ref={wrapRef} className="flex min-h-64 w-full justify-center">
      <div
        ref={frameRef}
        tabIndex={0}
        role="application"
        aria-label="Area that will be removed. Arrow keys move it. Shift takes a larger step. Alt and the arrow keys resize it from the bottom-right corner."
        onKeyDown={onKeyDown}
        className="relative outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg-3"
        style={box ? { width: box.width, height: box.height } : { width: '100%', minHeight: 280 }}
      >
        <canvas ref={canvasRef} className="block bg-white shadow-[var(--shadow)]" />
        {box && (
          <div
            className="absolute touch-none border-2 border-[var(--accent)] bg-[var(--accent)]/25"
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
            }}
          >
            <div
              className="absolute inset-0 cursor-move"
              onPointerDown={(event) => begin(event, 'move')}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            />
            <span className="pointer-events-none absolute left-1 top-1 rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-medium text-white">
              Will be removed
            </span>
            {HANDLES.map((handle) => (
              <button
                key={handle.id}
                type="button"
                aria-label={handle.label}
                className={`absolute z-10 size-8 rounded-full border border-[var(--accent)] bg-white shadow-[var(--shadow)] before:absolute before:inset-2.5 before:rounded-full before:bg-[var(--accent)] pointer-coarse:size-11 ${handle.className}`}
                onPointerDown={(event) => begin(event, handle.id)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
              />
            ))}
          </div>
        )}
        {rendering && (
          <div className="absolute inset-0 grid place-items-center bg-page/70">
            <Spinner label="Drawing the page" />
          </div>
        )}
        {error && (
          <p className="absolute inset-x-3 bottom-3 rounded-md bg-danger-soft px-2 py-1 text-[12px] text-danger">{error}</p>
        )}
      </div>
    </div>
  )
}
