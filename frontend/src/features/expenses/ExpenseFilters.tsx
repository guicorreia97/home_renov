import { SelectField } from '../../components/SelectField'
import { categoryOptions, statusOptions } from './enumOptions'
import type { ExpenseFilters as ExpenseFiltersValue } from './formTypes'

export interface ExpenseFiltersProps {
  filters: ExpenseFiltersValue
  onChange: (filters: ExpenseFiltersValue) => void
}

const statusSelectOptions = [{ value: 'all', label: 'All statuses' }, ...statusOptions]
const categorySelectOptions = [{ value: 'all', label: 'All categories' }, ...categoryOptions]

/** Filters the already-fetched list client-side — presentation, not money maths. */
export function ExpenseFilters({ filters, onChange }: ExpenseFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <SelectField
        label="Status"
        options={statusSelectOptions}
        value={filters.status}
        onChange={(e) =>
          onChange({ ...filters, status: e.target.value as ExpenseFiltersValue['status'] })
        }
        className="min-w-field"
      />
      <SelectField
        label="Category"
        options={categorySelectOptions}
        value={filters.category}
        onChange={(e) =>
          onChange({ ...filters, category: e.target.value as ExpenseFiltersValue['category'] })
        }
        className="min-w-field"
      />
    </div>
  )
}
