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
      <div className="min-h-dvh text-fg">
        <header className="border-b border-line bg-frame/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Brand />
            {session.doc && (
              <Button type="button" variant="ghost" onClick={() => session.setConfirmReset(true)}>
                New file
              </Button>
            )}
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4">
          <Callout tone="info" title="Everything stays in this browser">
            SASHecg has no server. The PDF, the password, and the patient details never leave this device. Closing or
            reloading the tab forgets them.
          </Callout>

          <Stepper value={stage} onValueChange={session.goTo} linear={false} aria-label="Anonymization steps">
            <StepperStep title="Upload" description="One PDF" />
            <StepperStep title="Define area" description="Rectangles" disabled={session.maxStage < 1} />
            <StepperStep title="Review" description="Thumbnails" disabled={session.maxStage < 2} />
            <StepperStep title="Export" description="One ZIP" disabled={session.maxStage < 3} />
          </Stepper>

          <main>
            {stage === 0 && <UploadStep session={session} />}
            {stage === 1 && <DefineStep session={session} />}
            {stage === 2 && <ReviewStep session={session} />}
            {stage === 3 && <ExportStep session={session} />}
          </main>
        </div>

        <footer className="mx-auto max-w-6xl px-4 pb-8 text-[12px] text-fg-3">
          SASHecg covers only the rectangles you mark. It does not look for other details that remain visible on the page.
        </footer>

        <div className="sr-only" aria-live="polite">
          {session.status}
        </div>

        <Dialog open={session.confirmReset} onOpenChange={session.setConfirmReset}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start with another file?</DialogTitle>
              <DialogDescription>
                This tab forgets the PDF, the password, and the areas. Nothing is sent to a server.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => session.setConfirmReset(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={() => void session.reset()}>
                New file
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </IconButtonProvider>
  )
}
