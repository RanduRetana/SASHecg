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
        <h1 className="text-xl font-medium tracking-[-0.03em]">Descarga el ZIP</h1>
        <p className="text-[13.5px] leading-relaxed text-fg-2">
          Un PDF por página, con nombres estables: ecg-001.pdf, ecg-002.pdf y así. Cada archivo es una imagen plana.
          Bajo la máscara no hay texto que recuperar.
        </p>
      </header>

      <div className="grid gap-2 rounded-xl border border-line bg-raised p-4 shadow-[var(--shadow)]">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <Download />
          {filename}
        </div>
        <p className="text-[13px] text-fg-2">
          {ready.length} de {doc.pageCount} páginas · cerca de {formatBytes(bytes)} antes de empaquetar
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
        <Callout tone="warning" title="Aún no se puede exportar">
          {session.stale
            ? 'El área cambió después de procesar. Vuelve a generar las páginas.'
            : session.failures.length
              ? 'Hay páginas con error. El ZIP no se crea hasta que el lote esté completo.'
              : 'Faltan páginas por procesar.'}
        </Callout>
      )}

      {session.exportError && (
        <Callout tone="danger" title="No se descargó">
          {session.exportError}
        </Callout>
      )}

      {session.exportName && (
        <Callout tone="success" title="Listo">
          Se descargó {session.exportName} en este dispositivo. El archivo original sigue solo en la memoria de esta
          pestaña.
        </Callout>
      )}

      <Callout tone="info" title="Privacidad">
        El ZIP se arma en el navegador. SASHecg no lo sube a ningún sitio. Al recargar la página, el PDF y la
        contraseña se olvidan.
      </Callout>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-page/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button
          type="button"
          variant="primary"
          className="w-full sm:w-auto"
          disabled={!session.readyToExport || session.exporting}
          loading={session.exporting}
          loadingText="Preparando el ZIP…"
          onClick={() => void session.exportZip()}
        >
          Descargar ZIP
        </Button>
      </div>
    </section>
  )
}
