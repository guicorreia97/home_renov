import { SelectField } from '../../components/SelectField'
import { useTranslation } from '../../i18n'
import { categoryOptions, statusOptions } from './enumOptions'
import type { ExpenseFilters as ExpenseFiltersValue } from './formTypes'

export interface ExpenseFiltersProps {
  filters: ExpenseFiltersValue
  onChange: (filters: ExpenseFiltersValue) => void
}

/** Filters the already-fetched list client-side — presentation, not money maths. */
export function ExpenseFilters({ filters, onChange }: ExpenseFiltersProps) {
  const { t } = useTranslation()
  const statusSelectOptions = [
    { value: 'all', label: t('expenses.filter.allStatuses') },
    ...statusOptions(t),
  ]
  const categorySelectOptions = [
    { value: 'all', label: t('expenses.filter.allCategories') },
    ...categoryOptions(t),
  ]

  return (
    <div className="flex flex-wrap gap-4">
      <SelectField
        label={t('expense.field.status')}
        options={statusSelectOptions}
        value={filters.status}
        onChange={(e) =>
          onChange({ ...filters, status: e.target.value as ExpenseFiltersValue['status'] })
        }
        className="min-w-field"
      />
      <SelectField
        label={t('expense.field.category')}
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
