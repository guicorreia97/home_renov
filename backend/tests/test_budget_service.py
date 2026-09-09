from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from app.src.models.budget import Budget, BudgetUpdate
from app.src.models.expense import (
    Expense,
    ExpenseCategory,
    ExpenseCreate,
    ExpenseStatus,
    PaymentMethod,
)
from app.src.services.budget_service import BudgetService


class FakeBudgetRepository:
    def __init__(self) -> None:
        self._budget = Budget(updated_at=datetime.now(UTC))

    def get(self) -> Budget:
        return self._budget

    def update(self, changes: BudgetUpdate) -> Budget:
        self._budget = self._budget.model_copy(
            update={**changes.model_dump(exclude_unset=True), "updated_at": datetime.now(UTC)}
        )
        return self._budget


class FakeExpenseRepository:
    def __init__(self, expenses: list[Expense] | None = None) -> None:
        self._expenses = list(expenses or [])

    def list(self) -> list[Expense]:
        return self._expenses

    def get(self, expense_id: str) -> Expense | None:
        return next((e for e in self._expenses if e.id == expense_id), None)

    def add(self, expense: ExpenseCreate) -> Expense:
        raise NotImplementedError

    def update(self, expense_id: str, changes: object) -> Expense | None:
        raise NotImplementedError

    def delete(self, expense_id: str) -> bool:
        raise NotImplementedError


def make_expense(
    amount: str,
    status: ExpenseStatus = ExpenseStatus.PAID,
    category: ExpenseCategory = ExpenseCategory.MATERIALS,
) -> Expense:
    now = datetime.now(UTC)
    return Expense(
        id=str(uuid.uuid4()),
        created_at=now,
        updated_at=now,
        description="Expense",
        amount=Decimal(amount),
        category=category,
        payment_method=PaymentMethod.CREDIT_CARD,
        payee="Payee",
        incurred_on=date(2026, 1, 15),
        status=status,
    )


def test_get_returns_empty_budget_when_none_set() -> None:
    service = BudgetService(FakeBudgetRepository(), FakeExpenseRepository(), "EUR")

    budget = service.get()

    assert budget.planned_budget is None
    assert budget.target_sale_price is None
    assert budget.purchase_price is None


def test_update_changes_specified_field() -> None:
    service = BudgetService(FakeBudgetRepository(), FakeExpenseRepository(), "EUR")

    updated = service.update(BudgetUpdate(planned_budget=Decimal("50000")))

    assert updated.planned_budget == Decimal("50000.00")


def test_summary_totals_are_zero_with_no_expenses() -> None:
    service = BudgetService(FakeBudgetRepository(), FakeExpenseRepository(), "EUR")

    summary = service.summary()

    assert summary.total_paid == Decimal("0.00")
    assert summary.total_committed == Decimal("0.00")
    assert summary.total_planned == Decimal("0.00")
    assert summary.total_forecast == Decimal("0.00")
    assert summary.expense_count == 0
    assert summary.by_category == []


def test_summary_total_committed_is_paid_plus_pending() -> None:
    expenses = [
        make_expense("100.00", ExpenseStatus.PAID),
        make_expense("50.00", ExpenseStatus.PENDING),
        make_expense("25.00", ExpenseStatus.PLANNED),
    ]
    service = BudgetService(FakeBudgetRepository(), FakeExpenseRepository(expenses), "EUR")

    summary = service.summary()

    assert summary.total_paid == Decimal("100.00")
    assert summary.total_committed == Decimal("150.00")
    assert summary.total_planned == Decimal("25.00")
    assert summary.total_forecast == Decimal("175.00")


def test_summary_remaining_budget_is_none_without_planned_budget() -> None:
    service = BudgetService(FakeBudgetRepository(), FakeExpenseRepository(), "EUR")

    summary = service.summary()

    assert summary.remaining_budget is None
    assert summary.budget_used_percent is None
    assert summary.over_budget is False


def test_summary_remaining_budget_is_planned_minus_forecast() -> None:
    budgets = FakeBudgetRepository()
    budgets.update(BudgetUpdate(planned_budget=Decimal("1000")))
    expenses = [make_expense("200.00", ExpenseStatus.PAID)]
    service = BudgetService(budgets, FakeExpenseRepository(expenses), "EUR")

    summary = service.summary()

    assert summary.remaining_budget == Decimal("800.00")
    assert summary.budget_used_percent == 20.0
    assert summary.over_budget is False


def test_summary_over_budget_when_forecast_exceeds_planned_budget() -> None:
    budgets = FakeBudgetRepository()
    budgets.update(BudgetUpdate(planned_budget=Decimal("100")))
    expenses = [make_expense("150.00", ExpenseStatus.PAID)]
    service = BudgetService(budgets, FakeExpenseRepository(expenses), "EUR")

    summary = service.summary()

    assert summary.over_budget is True
    assert summary.remaining_budget == Decimal("-50.00")


def test_summary_projected_profit_is_none_without_target_sale_price() -> None:
    service = BudgetService(FakeBudgetRepository(), FakeExpenseRepository(), "EUR")

    summary = service.summary()

    assert summary.projected_profit is None


def test_summary_projected_profit_treats_missing_purchase_price_as_zero() -> None:
    budgets = FakeBudgetRepository()
    budgets.update(BudgetUpdate(target_sale_price=Decimal("500000")))
    expenses = [make_expense("50000.00", ExpenseStatus.PAID)]
    service = BudgetService(budgets, FakeExpenseRepository(expenses), "EUR")

    summary = service.summary()

    assert summary.projected_profit == Decimal("450000.00")


def test_summary_projected_profit_subtracts_purchase_price_and_forecast() -> None:
    budgets = FakeBudgetRepository()
    budgets.update(
        BudgetUpdate(target_sale_price=Decimal("500000"), purchase_price=Decimal("300000"))
    )
    expenses = [make_expense("50000.00", ExpenseStatus.PAID)]
    service = BudgetService(budgets, FakeExpenseRepository(expenses), "EUR")

    summary = service.summary()

    assert summary.projected_profit == Decimal("150000.00")


def test_summary_by_category_excludes_planned_expenses() -> None:
    expenses = [
        make_expense("100.00", ExpenseStatus.PAID, ExpenseCategory.MATERIALS),
        make_expense("50.00", ExpenseStatus.PENDING, ExpenseCategory.MATERIALS),
        make_expense("25.00", ExpenseStatus.PLANNED, ExpenseCategory.LABOUR),
    ]
    service = BudgetService(FakeBudgetRepository(), FakeExpenseRepository(expenses), "EUR")

    summary = service.summary()

    assert len(summary.by_category) == 1
    assert summary.by_category[0].category == ExpenseCategory.MATERIALS
    assert summary.by_category[0].amount == Decimal("150.00")


def test_summary_expense_count_matches_number_of_expenses() -> None:
    expenses = [make_expense("10.00"), make_expense("20.00")]
    service = BudgetService(FakeBudgetRepository(), FakeExpenseRepository(expenses), "EUR")

    summary = service.summary()

    assert summary.expense_count == 2


def test_summary_uses_configured_currency() -> None:
    service = BudgetService(FakeBudgetRepository(), FakeExpenseRepository(), "USD")

    summary = service.summary()

    assert summary.currency == "USD"
