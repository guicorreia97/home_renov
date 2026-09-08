from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

import pytest

from app.src.exceptions import EmptyUpdateError, ExpenseNotFoundError
from app.src.models.expense import (
    Expense,
    ExpenseCategory,
    ExpenseCreate,
    ExpenseStatus,
    ExpenseUpdate,
    PaymentMethod,
)
from app.src.services.expense_service import ExpenseService


class FakeExpenseRepository:
    def __init__(self) -> None:
        self._expenses: dict[str, Expense] = {}

    def list(self) -> list[Expense]:
        return list(self._expenses.values())

    def get(self, expense_id: str) -> Expense | None:
        return self._expenses.get(expense_id)

    def add(self, expense: ExpenseCreate) -> Expense:
        now = datetime.now(UTC)
        created = Expense(
            id=str(uuid.uuid4()), created_at=now, updated_at=now, **expense.model_dump()
        )
        self._expenses[created.id] = created

        return created

    def update(self, expense_id: str, changes: ExpenseUpdate) -> Expense | None:
        current = self._expenses.get(expense_id)
        if current is None:
            return None

        updated = current.model_copy(
            update={**changes.model_dump(exclude_unset=True), "updated_at": datetime.now(UTC)}
        )
        self._expenses[expense_id] = updated

        return updated

    def delete(self, expense_id: str) -> bool:
        return self._expenses.pop(expense_id, None) is not None


def make_expense_create(**overrides: object) -> ExpenseCreate:
    fields = {
        "description": "Kitchen tiles",
        "amount": Decimal("1250.00"),
        "category": ExpenseCategory.MATERIALS,
        "payment_method": PaymentMethod.CREDIT_CARD,
        "payee": "Tile Depot",
        "incurred_on": date(2026, 1, 15),
    }
    fields.update(overrides)
    return ExpenseCreate(**fields)


def test_list_returns_empty_when_no_expenses_exist() -> None:
    service = ExpenseService(FakeExpenseRepository())

    assert service.list() == []


def test_create_persists_and_returns_expense() -> None:
    service = ExpenseService(FakeExpenseRepository())

    created = service.create(make_expense_create())

    assert created.description == "Kitchen tiles"
    assert service.list() == [created]


def test_get_returns_matching_expense() -> None:
    service = ExpenseService(FakeExpenseRepository())
    created = service.create(make_expense_create())

    assert service.get(created.id) == created


def test_get_raises_expense_not_found_for_unknown_id() -> None:
    service = ExpenseService(FakeExpenseRepository())

    with pytest.raises(ExpenseNotFoundError):
        service.get("unknown-id")


def test_update_changes_only_specified_fields() -> None:
    service = ExpenseService(FakeExpenseRepository())
    created = service.create(make_expense_create())

    updated = service.update(created.id, ExpenseUpdate(description="Bathroom tiles"))

    assert updated.description == "Bathroom tiles"
    assert updated.amount == created.amount


def test_update_raises_empty_update_error_for_no_changes() -> None:
    service = ExpenseService(FakeExpenseRepository())
    created = service.create(make_expense_create())

    with pytest.raises(EmptyUpdateError):
        service.update(created.id, ExpenseUpdate())


def test_update_raises_expense_not_found_for_unknown_id() -> None:
    service = ExpenseService(FakeExpenseRepository())

    with pytest.raises(ExpenseNotFoundError):
        service.update("unknown-id", ExpenseUpdate(description="Anything"))


def test_delete_removes_expense() -> None:
    service = ExpenseService(FakeExpenseRepository())
    created = service.create(make_expense_create())

    service.delete(created.id)

    assert service.list() == []


def test_delete_raises_expense_not_found_for_unknown_id() -> None:
    service = ExpenseService(FakeExpenseRepository())

    with pytest.raises(ExpenseNotFoundError):
        service.delete("unknown-id")


def test_create_defaults_status_to_paid() -> None:
    service = ExpenseService(FakeExpenseRepository())

    created = service.create(make_expense_create())

    assert created.status == ExpenseStatus.PAID
