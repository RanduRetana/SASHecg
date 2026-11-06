import { formatDpi, formatMillimeters } from '@/core/format'
import type { Session } from '@/state/useSession'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Checkbox } from '@/components/ui/checkbox'
import { ProgressBar } from '@/components/ui/progress-bar'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ReviewStep({ session }: { session: Session }) {
  const doc = session.doc
  if (!doc) return null
  const current = session.slots[session.active]
  const selected = [...session.selection].sort((a, b) => a - b)

  return (
    <section className="grid gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-xl font-medium tracking-[-0.03em]">Revisa cada página</h1>
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-fg-2">
            Las miniaturas ya están anonimizadas. Si una hoja trae el bloque en otro sitio, selecciónala y define una
            excepción.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => session.setSelection(doc.pages.map((page) => page.index))}>
            Todas
          </Button>
          <Button type="button" variant="ghost" onClick={() => session.setSelection([])}>
            Ninguna
          </Button>
        </div>
      </header>

      {session.processing && session.progress && (
        <div className="grid gap-2">
          <ProgressBar
            value={session.progress.total ? (session.progress.done / session.progress.total) * 100 : 0}
            label="Procesando en este navegador"
            description={`${session.progress.done} de ${session.progress.total}`}
          />
          <Button type="button" variant="danger" onClick={() => session.cancel()}>
            Cancelar
          </Button>
        </div>
      )}

      {session.cancelled && !session.readyToExport && (
        <Callout
          tone="warning"
          title="Proceso interrumpido"
          action={
            <Button type="button" variant="secondary" disabled={session.processing} onClick={() => void session.process()}>
              Reanudar todo
            </Button>
          }
        >
          Faltan páginas. El ZIP no se crea hasta que el lote esté completo.
        </Callout>
      )}

      {session.stale && (
        <Callout
          tone="warning"
          title="El área cambió"
          action={
            <Button type="button" variant="secondary" disabled={session.processing} onClick={() => void session.process()}>
              Reprocesar todo
            </Button>
          }
        >
          Las miniaturas no coinciden con el recuadro actual.
        </Callout>
      )}

      {session.failures.length > 0 && (
        <Callout
          tone="danger"
          title={`${session.failures.length} ${session.failures.length === 1 ? 'página no se procesó' : 'páginas no se procesaron'}`}
          action={
            <Button
              type="button"
              variant="danger"
              disabled={session.processing}
              onClick={() => void session.process(session.failures.map((failure) => failure.index))}
            >
              Reintentar
            </Button>
          }
        >
          {session.failures
            .slice(0, 4)
            .map((failure) => `Página ${failure.index + 1}: ${failure.message}`)
            .join(' ')}
        </Callout>
      )}

      {session.warnings.length > 0 && (
        <Callout tone="note" size="sm" title="Resolución reducida">
          {session.warnings[0]}
        </Callout>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <ScrollArea className="h-[min(70vh,820px)] rounded-xl border border-line bg-frame" aria-label="Páginas anonimizadas">
          <ul className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 xl:grid-cols-4">
            {doc.pages.map((info) => {
              const slot = session.slots[info.index]
              const isActive = session.active === info.index
              const isSelected = session.selection.includes(info.index)
              return (
                <li key={info.index}>
                  <article
                    className={`rounded-lg border bg-raised p-1.5 ${isActive ? 'border-fg' : 'border-line'} ${isSelected ? 'ring-2 ring-info/50' : ''}`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-1 px-0.5">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => session.toggleSelected(info.index, false)}
                        aria-label={`Seleccionar página ${info.index + 1}`}
                      />
                      <span className="text-[12px] tabular-nums text-fg-2">{info.index + 1}</span>
                    </div>
                    <button
                      type="button"
                      className="block w-full rounded-md outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg-3"
                      aria-pressed={isActive}
                      aria-label={`Ver página ${info.index + 1}`}
                      onClick={(event) => {
                        if (event.shiftKey) session.toggleSelected(info.index, true)
                        else session.setActive(info.index)
                      }}
                    >
                      {slot ? (
                        <img
                          src={slot.previewUrl}
                          alt=""
                          className="aspect-[3/4] w-full rounded bg-white object-contain object-top"
                        />
                      ) : (
                        <span className="grid aspect-[3/4] place-items-center rounded bg-page px-2 text-center text-[12px] text-fg-3">
                          Sin procesar
                        </span>
                      )}
                    </button>
                    <div className="mt-1 flex items-center justify-between gap-1 px-0.5">
                      <span className="truncate text-[10.5px] text-fg-3">{slot?.filename ?? '—'}</span>
                      {slot?.exception ? (
                        <Badge tone="warning" size="sm">
                          Excepción
                        </Badge>
                      ) : null}
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        </ScrollArea>

        <aside className="grid gap-3 rounded-xl border border-line bg-raised p-4 shadow-[var(--shadow)] lg:sticky lg:top-4">
          <h2 className="text-[14px] font-medium">Página {session.active + 1}</h2>
          {current ? (
            <>
              <img src={current.previewUrl} alt={`Página ${session.active + 1} anonimizada`} className="w-full rounded-md bg-white" />
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                <dt className="text-fg-3">Archivo</dt>
                <dd className="text-right tabular-nums">{current.filename}</dd>
                <dt className="text-fg-3">Tamaño</dt>
                <dd className="text-right">{formatMillimeters(current.widthPt, current.heightPt)}</dd>
                <dt className="text-fg-3">Resolución</dt>
                <dd className="text-right">{formatDpi(current.dpi)}</dd>
                <dt className="text-fg-3">Área</dt>
                <dd className="text-right tabular-nums">
                  {current.rect.x.toFixed(3)}, {current.rect.y.toFixed(3)}
                </dd>
              </dl>
              {current.exception ? <Badge tone="warning">Excepción</Badge> : <Badge>Área común</Badge>}
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-fg-2">Esta página todavía no tiene una imagen anonimizada.</p>
          )}

          <div className="grid gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={selected.length === 0}
              onClick={() => session.editPages(selected.length ? selected : [session.active])}
            >
              Ajustar selección
            </Button>
            <Button type="button" variant="secondary" onClick={() => session.editPages([session.active])}>
              Ajustar esta página
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!session.overrides[session.active] && selected.every((index) => !session.overrides[index])}
              onClick={() => session.clearExceptions(selected.length ? selected : [session.active])}
            >
              Quitar excepción
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={session.processing}
              disabled={session.processing}
              onClick={() => void session.process(selected.length ? selected : [session.active])}
            >
              Reprocesar
            </Button>
          </div>
          <p className="text-[11.5px] leading-relaxed text-fg-3">Mayús y clic en una miniatura selecciona el rango.</p>
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-page/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="primary" className="w-full sm:w-auto" disabled={!session.readyToExport} onClick={() => session.goTo(3)}>
          Continuar a exportar
        </Button>
      </div>
    </section>
  )
}
