import { StrictMode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Modal } from './Modal'

/**
 * Regression coverage for the dismissal defect fixed 2026-09-08, where "Add
 * expense" appeared to do nothing: dismissal hung off the `close` event, and
 * `close()` *queues* that event rather than dispatching it, so under
 * StrictMode's mount/cleanup/remount the event queued by the cleanup landed
 * after the second effect re-attached the listener — dismissing the modal the
 * instant it opened.
 *
 * The test that pins the fix is "ignores a programmatic close event": the old
 * implementation listened for `close` and would call onClose there, this one
 * only ever reacts to `cancel`. Verified 2026-09-09 against a copy of the
 * pre-fix component — it fails there and passes here. The StrictMode test
 * below cannot do that job on its own: happy-dom dispatches `close`
 * synchronously rather than queueing it as a browser does, so the original
 * timing bug does not reproduce under it and the old component survives that
 * test too.
 *
 * The native <dialog> supplies the focus trap, focus restoration and modal
 * semantics; none of that is reimplemented, so none of it is tested here.
 */
describe('Modal', () => {
  it('opens as a modal dialog', () => {
    render(
      <Modal title="Budget settings" onClose={vi.fn()}>
        <p>body</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog')).toHaveProperty('open', true)
  })

  it('exposes its title as the dialog’s accessible name', () => {
    render(
      <Modal title="Budget settings" onClose={vi.fn()}>
        <p>body</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Budget settings')
  })

  it('stays open through a StrictMode double-mount and does not dismiss itself', () => {
    const onClose = vi.fn()

    render(
      <StrictMode>
        <Modal title="Budget settings" onClose={onClose}>
          <p>body</p>
        </Modal>
      </StrictMode>,
    )

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveProperty('open', true)
    expect(screen.getByText('body')).toBeVisible()
  })

  it('ignores a programmatic close event, so only a real dismissal counts', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Budget settings" onClose={onClose}>
        <p>body</p>
      </Modal>,
    )

    fireEvent(screen.getByRole('dialog'), new Event('close'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('dismisses exactly once on Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Budget settings" onClose={onClose}>
        <p>body</p>
      </Modal>,
    )

    // `cancel` is what a browser raises for Escape on an open modal dialog, and
    // it is the only signal this component treats as a dismissal.
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps the element in React’s hands by preventing the default Escape close', () => {
    render(
      <Modal title="Budget settings" onClose={vi.fn()}>
        <p>body</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')

    fireEvent(dialog, new Event('cancel', { cancelable: true }))

    // The parent unmounts the Modal in response to onClose; the dialog must not
    // have closed itself behind React's back in the meantime.
    expect(dialog).toHaveProperty('open', true)
  })

  it('closes the dialog on unmount without reporting a user dismissal', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <Modal title="Budget settings" onClose={onClose}>
        <p>body</p>
      </Modal>,
    )

    unmount()

    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders its children', () => {
    render(
      <Modal title="Budget settings" onClose={vi.fn()}>
        <button type="button">Save</button>
      </Modal>,
    )

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})
