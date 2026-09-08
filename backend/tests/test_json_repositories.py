from datetime import date
from decimal import Decimal
from pathlib import Path

from app.src.models.budget import BudgetUpdate
from app.src.models.expense import (
    ExpenseCategory,
    ExpenseCreate,
    ExpenseUpdate,
    PaymentMethod,
)
from app.src.repositories.json_budget_repository import JsonBudgetRepository
from app.src.repositories.json_expense_repository import JsonExpenseRepository


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


def test_expense_list_returns_empty_when_file_missing(tmp_path: Path) -> None:
    repository = JsonExpenseRepository(tmp_path)

    assert repository.list() == []


def test_expense_get_returns_none_when_file_missing(tmp_path: Path) -> None:
    repository = JsonExpenseRepository(tmp_path)

    assert repository.get("unknown-id") is None


def test_expense_add_persists_and_is_listed(tmp_path: Path) -> None:
    repository = JsonExpenseRepository(tmp_path)

    created = repository.add(make_expense_create())

    assert repository.list() == [created]
    assert repository.get(created.id) == created


def test_expense_update_changes_only_specified_fields(tmp_path: Path) -> None:
    repository = JsonExpenseRepository(tmp_path)
    created = repository.add(make_expense_create())

    updated = repository.update(created.id, ExpenseUpdate(description="Bathroom tiles"))

    assert updated is not None
    assert updated.description == "Bathroom tiles"
    assert updated.amount == created.amount
    assert repository.get(created.id).description == "Bathroom tiles"


def test_expense_update_returns_none_for_unknown_id(tmp_path: Path) -> None:
    repository = JsonExpenseRepository(tmp_path)

    assert repository.update("unknown-id", ExpenseUpdate(description="Anything")) is None


def test_expense_delete_removes_record(tmp_path: Path) -> None:
    repository = JsonExpenseRepository(tmp_path)
    created = repository.add(make_expense_create())

    assert repository.delete(created.id) is True
    assert repository.list() == []


def test_expense_delete_returns_false_for_unknown_id(tmp_path: Path) -> None:
    repository = JsonExpenseRepository(tmp_path)

    assert repository.delete("unknown-id") is False


def test_expense_write_leaves_no_temp_file_behind(tmp_path: Path) -> None:
    repository = JsonExpenseRepository(tmp_path)

    repository.add(make_expense_create())

    assert not (tmp_path / "expenses.json.tmp").exists()
    assert (tmp_path / "expenses.json").exists()


def test_budget_get_returns_empty_budget_when_file_missing(tmp_path: Path) -> None:
    repository = JsonBudgetRepository(tmp_path)

    budget = repository.get()

    assert budget.planned_budget is None
    assert budget.target_sale_price is None
    assert budget.purchase_price is None


def test_budget_update_persists_and_round_trips(tmp_path: Path) -> None:
    repository = JsonBudgetRepository(tmp_path)

    repository.update(BudgetUpdate(planned_budget=Decimal("50000")))

    assert repository.get().planned_budget == Decimal("50000.00")


def test_budget_write_leaves_no_temp_file_behind(tmp_path: Path) -> None:
    repository = JsonBudgetRepository(tmp_path)

    repository.update(BudgetUpdate(planned_budget=Decimal("50000")))

    assert not (tmp_path / "budget.json.tmp").exists()
    assert (tmp_path / "budget.json").exists()
