import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from 'react'

export interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * A floating panel built on the native `<dialog>` element: `showModal()` gives
 * us a focus trap, Escape-to-close and focus restoration to the trigger for
 * free, instead of reimplementing all three by hand.
 *
 * Dismissal is driven by the `cancel` event, never `close`. `close` is the wrong
 * signal: `HTMLDialogElement.close()` *queues* the event rather than dispatching
 * it, so under StrictMode's mount/unmount/remount the event queued by the
 * cleanup's `close()` lands after the second effect has re-attached the
 * listener — and the modal dismisses itself the instant it opens. `cancel` fires
 * only on a genuine user dismissal, so it cannot be spoofed by our own cleanup.
 */
export function Modal({ title, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    dialog.showModal()

    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  /**
   * Escape. The default action would close the dialog behind React's back,
   * leaving the element open in the tree; preventing it keeps unmounting the
   * single way this component ever goes away.
   */
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault()
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      aria-labelledby={titleId}
      className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-card border border-border bg-surface p-6 text-text shadow-floating backdrop:bg-overlay"
    >
      <h2 id={titleId} className="text-card-title text-text">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </dialog>
  )
}
