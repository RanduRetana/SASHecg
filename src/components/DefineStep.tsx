import { ChevronLeft, ChevronRight } from '@/lib/icons'
import { formatDpi } from '@/core/format'
import type { Session } from '@/state/useSession'
import { RedactionEditor } from '@/components/RedactionEditor'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { IconButton } from '@/components/ui/icon-button'
import { NumberField } from '@/components/ui/number-field'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'

const numberFormat = { minimumFractionDigits: 3, maximumFractionDigits: 3 } as const

export function DefineStep({ session }: { session: Session }) {
  const doc = session.doc
  const page = doc?.pages[session.editorPage]
  if (!doc || !session.pdf || !page) return null

  const rect = session.activeRect
  const coverage = Math.round(rect.width * rect.height * 1000) / 10

  return (
    <section className="grid gap-4">
      <header className="grid gap-1">
        <h1 className="text-xl font-medium tracking-[-0.03em]">Mark the upper-left corner</h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-fg-2">
          The starting rectangle covers the identifier block. Fit it to your template. Only that zone is covered: the
          trace and the rest of the page stay.
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-xl border border-line bg-frame p-3 shadow-[var(--shadow)]">
          <RedactionEditor
            pdf={session.pdf}
            pageIndex={session.editorPage}
            widthPt={page.widthPt}
            heightPt={page.heightPt}
            rect={rect}
            onChange={session.updateRect}
          />
          <p className="mt-2 text-[12px] leading-relaxed text-fg-3">
            The purple mask is a guide. When you process, that zone is painted with an opaque rectangle on a picture of
            the page. The original text is not left underneath.
          </p>
        </div>

        <div className="grid gap-3">
          <SegmentedControl
            value={session.scope}
            onValueChange={(value) => session.setScope(value === 'pages' ? 'pages' : 'all')}
            aria-label="Where the area applies"
            fill
          >
            <SegmentedControlItem value="all">All pages</SegmentedControlItem>
            <SegmentedControlItem value="pages">Exception</SegmentedControlItem>
          </SegmentedControl>

          {session.scope === 'pages' ? (
            <Callout tone="warning" size="sm" title="These pages only">
              {session.targets.length > 1
                ? `Moving the rectangle gives the same area to all ${session.targets.length} selected pages.`
                : `Page ${session.editorPage + 1} will use its own area. The others keep the shared area.`}
            </Callout>
          ) : (
            <Callout tone="info" size="sm" title="Same fraction on every page">
              A width of 0.30 is 30% of that page, even if the paper size changes.
            </Callout>
          )}

          <div className="flex items-center justify-between gap-2">
            <IconButton
              label="Previous page"
              variant="secondary"
              disabled={session.scope === 'pages' && session.targets.length > 1 ? false : session.editorPage <= 0}
              onClick={() => session.stepEditor(-1)}
            >
              <ChevronLeft />
            </IconButton>
            <p className="text-center text-[13px] tabular-nums">
              Page {session.editorPage + 1} of {doc.pageCount}
            </p>
            <IconButton
              label="Next page"
              variant="secondary"
              disabled={
                session.scope === 'pages' && session.targets.length > 1 ? false : session.editorPage >= doc.pageCount - 1
              }
              onClick={() => session.stepEditor(1)}
            >
              <ChevronRight />
            </IconButton>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <NumberField label="X" size="sm" min={0} max={1} step={0.001} locale="en" format={numberFormat} scrubSensitivity={12} value={rect.x} onValueChange={(value) => patch(session, 'x', value)} />
            <NumberField label="Y" size="sm" min={0} max={1} step={0.001} locale="en" format={numberFormat} scrubSensitivity={12} value={rect.y} onValueChange={(value) => patch(session, 'y', value)} />
            <NumberField label="Width" size="sm" min={0.02} max={1} step={0.001} locale="en" format={numberFormat} scrubSensitivity={12} value={rect.width} onValueChange={(value) => patch(session, 'width', value)} />
            <NumberField label="Height" size="sm" min={0.02} max={1} step={0.001} locale="en" format={numberFormat} scrubSensitivity={12} value={rect.height} onValueChange={(value) => patch(session, 'height', value)} />
          </div>
          <p className="text-[12px] leading-relaxed text-fg-3">
            Origin is the top left. This covers about {coverage.toLocaleString('en')}% of the page. Arrow keys move it;
            Shift takes a larger step; Alt and the arrows resize it.
          </p>

          {doc.mixed && (
            <Callout tone="warning" size="sm" title="Pages differ">
              Some pages have another size or rotation. Check the thumbnails: the area is a fraction of each page, not
              a fixed measurement.
            </Callout>
          )}

          {session.scope === 'pages' && (
            <Button type="button" variant="ghost" onClick={() => session.clearExceptions(session.targets)}>
              Remove exception
            </Button>
          )}

          <Button type="button" variant="secondary" onClick={() => session.updateRect({ x: 0, y: 0, width: 0.3, height: 0.155 })}>
            Restore the starting corner
          </Button>
        </div>
      </div>

      {session.processing && session.progress && (
        <div className="grid gap-3">
          <ProgressBar
            value={session.progress.total ? (session.progress.done / session.progress.total) * 100 : 0}
            label="Processing in this browser"
            description={`Page ${Math.min(session.progress.done + 1, session.progress.total)} of ${session.progress.total}${session.progress.dpi ? ` · ${formatDpi(session.progress.dpi)}` : ''}`}
          />
          <Button type="button" variant="danger" onClick={() => session.cancel()}>
            Cancel
          </Button>
        </div>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-page/95 px-4 py-3 backdrop-blur sm:static sm:z-auto sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="primary"
            className="w-full sm:w-auto"
            loading={session.processing}
            loadingText="Processing…"
            disabled={session.processing}
            onClick={() => void session.process(session.scope === 'pages' ? session.targets : undefined)}
          >
            {session.scope === 'pages' ? 'Process exception' : `Process ${doc.pageCount} pages`}
          </Button>
          {session.hasRun && (
            <Button type="button" variant="secondary" onClick={() => session.goTo(2)}>
              Back to review
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

function patch(session: Session, key: 'x' | 'y' | 'width' | 'height', value: number | null) {
  if (value == null) return
  session.updateRect({ ...session.activeRect, [key]: value })
}
