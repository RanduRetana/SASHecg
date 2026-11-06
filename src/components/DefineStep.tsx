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
        <h1 className="text-xl font-medium tracking-[-0.03em]">Marca la esquina superior izquierda</h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-fg-2">
          El recuadro de partida cubre el bloque de identificadores. Ajústalo a tu plantilla. Solo se tapa esa zona:
          el trazado y el resto de la hoja se conservan.
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
            La máscara roja es una guía. Al procesar, esa zona se pinta con un recuadro opaco sobre una imagen de la
            página: el texto original no queda debajo.
          </p>
        </div>

        <div className="grid gap-3">
          <SegmentedControl
            value={session.scope}
            onValueChange={(value) => session.setScope(value === 'pages' ? 'pages' : 'all')}
            aria-label="Dónde se aplica el área"
            fill
          >
            <SegmentedControlItem value="all">Todas</SegmentedControlItem>
            <SegmentedControlItem value="pages">Excepción</SegmentedControlItem>
          </SegmentedControl>

          {session.scope === 'pages' ? (
            <Callout tone="warning" size="sm" title="Solo estas páginas">
              {session.targets.length > 1
                ? `Al mover el recuadro, las ${session.targets.length} páginas seleccionadas pasan a usar esta misma área.`
                : `La página ${session.editorPage + 1} usará su propia área. Las demás siguen el área común.`}
            </Callout>
          ) : (
            <Callout tone="info" size="sm" title="Misma fracción en cada hoja">
              Un valor de 0,30 de ancho es el 30 % de esa página, aunque el papel cambie de tamaño.
            </Callout>
          )}

          <div className="flex items-center justify-between gap-2">
            <IconButton
              label="Página anterior"
              variant="secondary"
              disabled={session.scope === 'pages' && session.targets.length > 1 ? false : session.editorPage <= 0}
              onClick={() => session.stepEditor(-1)}
            >
              <ChevronLeft />
            </IconButton>
            <p className="text-center text-[13px] tabular-nums">
              Página {session.editorPage + 1} de {doc.pageCount}
            </p>
            <IconButton
              label="Página siguiente"
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
            <NumberField label="X" size="sm" min={0} max={1} step={0.001} locale="es" format={numberFormat} scrubSensitivity={12} value={rect.x} onValueChange={(value) => patch(session, 'x', value)} />
            <NumberField label="Y" size="sm" min={0} max={1} step={0.001} locale="es" format={numberFormat} scrubSensitivity={12} value={rect.y} onValueChange={(value) => patch(session, 'y', value)} />
            <NumberField label="Ancho" size="sm" min={0.02} max={1} step={0.001} locale="es" format={numberFormat} scrubSensitivity={12} value={rect.width} onValueChange={(value) => patch(session, 'width', value)} />
            <NumberField label="Alto" size="sm" min={0.02} max={1} step={0.001} locale="es" format={numberFormat} scrubSensitivity={12} value={rect.height} onValueChange={(value) => patch(session, 'height', value)} />
          </div>
          <p className="text-[12px] leading-relaxed text-fg-3">
            Origen arriba a la izquierda. Cubre cerca del {coverage.toLocaleString('es')} % de la página. Flechas para
            mover; Mayús acelera; Alt y flechas cambian el tamaño.
          </p>

          {doc.mixed && (
            <Callout tone="warning" size="sm" title="Páginas distintas">
              Hay hojas de otro tamaño o giradas. Revisa las miniaturas: el área se aplica en proporción, no en
              milímetros fijos.
            </Callout>
          )}

          {session.scope === 'pages' && (
            <Button type="button" variant="ghost" onClick={() => session.clearExceptions(session.targets)}>
              Quitar excepción
            </Button>
          )}

          <Button type="button" variant="secondary" onClick={() => session.updateRect({ x: 0, y: 0, width: 0.3, height: 0.155 })}>
            Restaurar esquina inicial
          </Button>
        </div>
      </div>

      {session.processing && session.progress && (
        <div className="grid gap-3">
          <ProgressBar
            value={session.progress.total ? (session.progress.done / session.progress.total) * 100 : 0}
            label="Procesando en este navegador"
            description={`Página ${Math.min(session.progress.done + 1, session.progress.total)} de ${session.progress.total}${session.progress.dpi ? ` · ${formatDpi(session.progress.dpi)}` : ''}`}
          />
          <Button type="button" variant="danger" onClick={() => session.cancel()}>
            Cancelar
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
            loadingText="Procesando…"
            disabled={session.processing}
            onClick={() => void session.process(session.scope === 'pages' ? session.targets : undefined)}
          >
            {session.scope === 'pages' ? 'Procesar excepción' : `Procesar ${doc.pageCount} páginas`}
          </Button>
          {session.hasRun && (
            <Button type="button" variant="secondary" onClick={() => session.goTo(2)}>
              Volver a la revisión
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
