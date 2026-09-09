from collections import defaultdict
from decimal import Decimal

from app.logging.log_config import log_config
from app.src.models.budget import Budget, BudgetSummary, BudgetUpdate, CategoryTotal
from app.src.models.expense import Expense, ExpenseCategory, ExpenseStatus
from app.src.repositories.budget_repository import BudgetRepository
from app.src.repositories.expense_repository import ExpenseRepository

logger = log_config.get_logger()

ZERO = Decimal("0")


class BudgetService:
    """Compares the renovation's financial targets against actual spend."""

    def __init__(
        self,
        budget_repository: BudgetRepository,
        expense_repository: ExpenseRepository,
        currency: str,
    ) -> None:
        self._budgets = budget_repository
        self._expenses = expense_repository
        self._currency = currency

    def get(self) -> Budget:
        return self._budgets.get()

    def update(self, changes: BudgetUpdate) -> Budget:
        budget = self._budgets.update(changes)
        logger.info("Budget updated", extra={"changed_fields": sorted(changes.model_fields_set)})

        return budget

    def summary(self) -> BudgetSummary:
        budget = self._budgets.get()
        expenses = self._expenses.list()

        total_paid = self._total(expenses, ExpenseStatus.PAID)
        total_pending = self._total(expenses, ExpenseStatus.PENDING)
        total_planned = self._total(expenses, ExpenseStatus.PLANNED)
        total_committed = total_paid + total_pending
        total_forecast = total_committed + total_planned

        summary = BudgetSummary(
            currency=self._currency,
            target_sale_price=budget.target_sale_price,
            purchase_price=budget.purchase_price,
            planned_budget=budget.planned_budget,
            total_paid=total_paid,
            total_committed=total_committed,
            total_planned=total_planned,
            total_forecast=total_forecast,
            remaining_budget=self._remaining(budget.planned_budget, total_forecast),
            budget_used_percent=self._used_percent(budget.planned_budget, total_forecast),
            over_budget=budget.planned_budget is not None
            and total_forecast > budget.planned_budget,
            projected_profit=self._projected_profit(budget, total_forecast),
            expense_count=len(expenses),
            by_category=self._by_category(expenses),
        )
        logger.info("Budget summary computed", extra={"expense_count": summary.expense_count})

        return summary

    @staticmethod
    def _total(expenses: list[Expense], status: ExpenseStatus) -> Decimal:
        return sum((e.amount for e in expenses if e.status is status), start=ZERO)

    @staticmethod
    def _remaining(planned_budget: Decimal | None, total_forecast: Decimal) -> Decimal | None:
        if planned_budget is None:
            return None
        return planned_budget - total_forecast

    @staticmethod
    def _used_percent(planned_budget: Decimal | None, total_forecast: Decimal) -> float | None:
        if planned_budget is None or planned_budget == ZERO:
            return None
        return round(float(total_forecast / planned_budget) * 100, 2)

    @staticmethod
    def _projected_profit(budget: Budget, total_forecast: Decimal) -> Decimal | None:
        """Sale price less what the property cost to buy and to renovate.

        Undefined without a target sale price; a missing purchase price counts
        as zero, so the figure is then the renovation margin alone.
        """
        if budget.target_sale_price is None:
            return None
        purchase_price = budget.purchase_price or ZERO

        return budget.target_sale_price - purchase_price - total_forecast

    @staticmethod
    def _by_category(expenses: list[Expense]) -> list[CategoryTotal]:
        totals: dict[ExpenseCategory, Decimal] = defaultdict(lambda: ZERO)
        for expense in expenses:
            if expense.status is not ExpenseStatus.PLANNED:
                totals[expense.category] += expense.amount

        return [
            CategoryTotal(category=category, amount=totals[category])
            for category in ExpenseCategory
            if category in totals
        ]
