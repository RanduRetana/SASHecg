import { Download } from '@/lib/icons'
import { formatBytes } from '@/core/format'
import { zipFileName } from '@/core/naming'
import type { Session } from '@/state/useSession'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'

export function ExportStep({ session }: { session: Session }) {
  const doc = session.doc
  if (!doc) return null
  const ready = session.slots.filter((slot) => slot)
  const filename = zipFileName(doc.name)
  const bytes = ready.reduce((sum, slot) => sum + (slot?.pdfBytes.byteLength ?? 0), 0)

  return (
    <section className="grid max-w-2xl gap-4">
      <header className="grid gap-1">
        <h1 className="text-xl font-medium tracking-[-0.03em]">Download the ZIP</h1>
        <p className="text-[13.5px] leading-relaxed text-fg-2">
          One PDF per page, named from the source file: report-ecg-001.pdf. Each file is a flat image. Nothing under the
          mask can be recovered.
        </p>
      </header>

      <div className="grid gap-2 rounded-xl border border-line bg-raised p-4 shadow-[var(--shadow)]">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <Download />
          {filename}
        </div>
        <p className="text-[13px] text-fg-2">
          {ready.length} of {doc.pageCount} pages · about {formatBytes(bytes)} before packaging
        </p>
        <ul className="grid gap-0.5 text-[12px] tabular-nums text-fg-3">
          {ready.slice(0, 3).map((slot) => (
            <li key={slot?.filename}>{slot?.filename}</li>
          ))}
          {ready.length > 4 && <li>…</li>}
          {ready.length > 3 && <li>{ready[ready.length - 1]?.filename}</li>}
        </ul>
      </div>

      {!session.readyToExport && (
        <Callout tone="warning" title="Not ready to export">
          {session.stale
            ? 'The area changed after processing. Generate the pages again.'
            : session.failures.length
              ? 'Some pages failed. The ZIP is created only when the batch is complete.'
              : 'Some pages still need processing.'}
        </Callout>
      )}

      {session.exportError && (
        <Callout tone="danger" title="Download failed">
          {session.exportError}
        </Callout>
      )}

      {session.exportName && (
        <Callout tone="success" title="Done">
          {session.exportName} downloaded on this device. The original file remains only in this tab’s memory.
        </Callout>
      )}

      <Callout tone="info" title="Privacy">
        The ZIP is built in the browser. SASHecg does not upload it. Reloading the page forgets the PDF and the
        password.
      </Callout>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-page/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button
          type="button"
          variant="primary"
          className="w-full sm:w-auto"
          disabled={!session.readyToExport || session.exporting}
          loading={session.exporting}
          loadingText="Preparing the ZIP…"
          onClick={() => void session.exportZip()}
        >
          Download ZIP
        </Button>
      </div>
    </section>
  )
}
