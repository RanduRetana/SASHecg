import { Brand } from '@/components/Brand'
import { DefineStep } from '@/components/DefineStep'
import { ExportStep } from '@/components/ExportStep'
import { ReviewStep } from '@/components/ReviewStep'
import { UploadStep } from '@/components/UploadStep'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IconButtonProvider } from '@/components/ui/icon-button'
import { Stepper, StepperStep } from '@/components/ui/stepper'
import { useSession } from '@/state/useSession'

export default function App() {
  const session = useSession()
  const stage = session.stage > session.maxStage ? session.maxStage : session.stage

  return (
    <IconButtonProvider>
      <div className="min-h-dvh bg-page text-fg">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Brand />
            {session.doc && (
              <Button type="button" variant="ghost" onClick={() => session.setConfirmReset(true)}>
                Nuevo archivo
              </Button>
            )}
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4">
          <Callout tone="info" title="Todo ocurre en este navegador">
            SASHecg no tiene servidor. El PDF, la contraseña y los datos del paciente no salen de este dispositivo. Al
            cerrar o recargar la pestaña, se olvidan.
          </Callout>

          <Stepper value={stage} onValueChange={session.goTo} linear={false} aria-label="Pasos de anonimización">
            <StepperStep title="Subir" description="Un PDF" />
            <StepperStep title="Definir área" description="Esquina superior" disabled={session.maxStage < 1} />
            <StepperStep title="Revisar" description="Miniaturas" disabled={session.maxStage < 2} />
            <StepperStep title="Exportar" description="Un ZIP" disabled={session.maxStage < 3} />
          </Stepper>

          <main>
            {stage === 0 && <UploadStep session={session} />}
            {stage === 1 && <DefineStep session={session} />}
            {stage === 2 && <ReviewStep session={session} />}
            {stage === 3 && <ExportStep session={session} />}
          </main>
        </div>

        <footer className="mx-auto max-w-6xl px-4 pb-8 text-[12px] text-fg-3">
          SASHecg tapa solo el rectángulo que marques. No adivina otros datos que queden visibles en la hoja.
        </footer>

        <div className="sr-only" aria-live="polite">
          {session.status}
        </div>

        <Dialog open={session.confirmReset} onOpenChange={session.setConfirmReset}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Empezar con otro archivo?</DialogTitle>
              <DialogDescription>
                Se olvida el PDF, la contraseña y las áreas de esta pestaña. No se envía nada a un servidor.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => session.setConfirmReset(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={() => void session.reset()}>
                Nuevo archivo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </IconButtonProvider>
  )
}
