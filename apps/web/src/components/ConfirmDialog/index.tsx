import { Button } from '@/components/Button'

type ConfirmDialogProps = {
  title: string
  description: string
  confirmLabel: string
  isConfirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog = ({
  title,
  description,
  confirmLabel,
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-black/70"
      onClick={onCancel}
      aria-hidden="true"
    />
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel()
      }}
    >
      <h2
        id="confirm-dialog-title"
        className="text-lg font-semibold text-card-foreground"
      >
        {title}
      </h2>
      <p
        id="confirm-dialog-description"
        className="mt-2 text-sm text-muted-foreground"
      >
        {description}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          disabled={isConfirming}
          className="flex-1 cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-card-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <div className="flex-1">
          <Button
            type="button"
            onClick={onConfirm}
            isLoading={isConfirming}
            className="!bg-destructive !py-2 !text-sm !text-destructive-foreground hover:!opacity-90"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  </div>
)
