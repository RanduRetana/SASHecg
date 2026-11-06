import { File as FileIcon, Lock } from '@/lib/icons'
import { formatBytes, formatMillimeters } from '@/core/format'
import type { Session } from '@/state/useSession'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Dropzone } from '@/components/ui/dropzone'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

const REJECTION: Record<string, string> = {
  type: 'Solo se aceptan PDF.',
  size: 'El archivo supera el límite de 512 MB de este navegador.',
  empty: 'El archivo está vacío.',
  count: 'Suelta un solo PDF cada vez.',
}

export function UploadStep({ session }: { session: Session }) {
  const first = session.doc?.pages[0]

  return (
    <section className="grid gap-4">
      <header className="grid gap-1">
        <h1 className="text-xl font-medium tracking-[-0.03em]">Sube un informe</h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-fg-2">
          Un PDF de varias páginas, como los que llegan juntos desde el electrocardiógrafo. Los datos del paciente
          suelen estar en la misma esquina de cada hoja.
        </p>
      </header>

      <Dropzone
        accept={['application/pdf', '.pdf']}
        multiple={false}
        maxFiles={1}
        maxSize={512 * 1024 * 1024}
        disabled={session.loading}
        paste="focus"
        label="Elegir PDF"
        title="Suelta el PDF aquí"
        hint="o elige el archivo. Se lee solo en este dispositivo."
        onFilesAccepted={(files) => {
          const file = files[0]
          if (file) void session.loadFile(file)
        }}
        onFilesRejected={(rejections) => {
          const reason = rejections[0]?.reason ?? 'type'
          session.reportFileError(REJECTION[reason] ?? 'No se pudo usar ese archivo.')
        }}
      />

      {session.loading && (
        <div className="flex items-center gap-2 text-[13px] text-fg-2">
          <Spinner size="sm" label="Abriendo el PDF" />
          Abriendo el PDF…
        </div>
      )}

      {session.fileError && (
        <Callout tone="danger" title="No se abrió">
          {session.fileError}
        </Callout>
      )}

      {session.passwordNeeded && (
        <form
          className="grid max-w-md gap-3 rounded-xl border border-line bg-raised p-4 shadow-[var(--shadow)]"
          onSubmit={(event) => {
            event.preventDefault()
            void session.submitPassword()
          }}
        >
          <div className="flex items-center gap-2 text-[13px] font-medium">
            <Lock />
            Contraseña del PDF
          </div>
          <Input
            type="password"
            autoComplete="off"
            value={session.password}
            onValueChange={session.setPassword}
            placeholder="No sale de este navegador"
            aria-label="Contraseña del PDF"
            invalid={Boolean(session.passwordError)}
          />
          <p className="text-[12px] leading-relaxed text-fg-3">
            Se usa una sola vez para descifrar el archivo aquí. No se guarda ni se envía.
          </p>
          {session.passwordError && <p className="text-[12px] text-danger">{session.passwordError}</p>}
          <Button type="submit" variant="primary" loading={session.loading} loadingText="Comprobando…">
            Abrir
          </Button>
        </form>
      )}

      {session.doc && first && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-raised px-4 py-3 shadow-[var(--shadow)]">
          <div className="flex min-w-0 items-center gap-3">
            <FileIcon />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{session.doc.name}</p>
              <p className="text-[12px] text-fg-3">
                {session.doc.pageCount} {session.doc.pageCount === 1 ? 'página' : 'páginas'} · {formatBytes(session.doc.size)} ·{' '}
                {formatMillimeters(first.widthPt, first.heightPt)}
                {session.doc.mixed ? ' · tamaños distintos' : ''}
              </p>
            </div>
          </div>
          <Button type="button" variant="primary" onClick={() => session.goTo(1)}>
            Definir área
          </Button>
        </div>
      )}

      <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-line-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-[12.5px] leading-relaxed text-fg-2">
          ¿Quieres ensayar sin un informe real? El ejemplo son tres páginas dibujadas, con un nombre ficticio en la
          esquina y la leyenda «sin datos reales».
        </p>
        <Button type="button" variant="secondary" loading={session.loading} onClick={() => void session.loadSample()}>
          Crear PDF de ejemplo
        </Button>
      </div>
    </section>
  )
}
