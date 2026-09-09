export type RemainingConclusionTone = 'success' | 'warning' | 'danger'

export interface RemainingConclusion {
  label: string
  amount: string
  percent: number | null
  tone: RemainingConclusionTone
}

const toneTextClass: Record<RemainingConclusionTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

const toneBarClass: Record<RemainingConclusionTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

function clampPercent(percent: number): number {
  return Math.min(100, Math.max(0, percent))
}

/** The strip's conclusion: remaining/over-budget figure plus a spend progress bar. */
export function RemainingConclusionBlock({ conclusion }: { conclusion: RemainingConclusion }) {
  const barWidth = clampPercent(conclusion.percent ?? 0)
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-label text-muted">{conclusion.label}</p>
        {conclusion.percent !== null && (
          <p className="text-label text-muted">{conclusion.percent.toFixed(1)}% of budget used</p>
        )}
      </div>
      <p className={`mt-1 text-numeric tabular ${toneTextClass[conclusion.tone]}`}>
        {conclusion.amount}
      </p>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-surface-raised"
        aria-hidden="true"
      >
        <div
          className={`h-2 rounded-pill ${toneBarClass[conclusion.tone]}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  )
}
