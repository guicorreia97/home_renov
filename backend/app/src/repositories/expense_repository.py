# Deferred annotations: this module defines a `list` method, which would
# otherwise shadow the builtin in its own signatures.
from __future__ import annotations

from typing import Protocol

from app.src.models.expense import Expense, ExpenseCreate, ExpenseUpdate


class ExpenseRepository(Protocol):
    """Storage contract for expenses. Services depend on this, never on JSON."""

    def list(self) -> list[Expense]: ...

    def get(self, expense_id: str) -> Expense | None: ...

    def add(self, expense: ExpenseCreate) -> Expense: ...

    def update(self, expense_id: str, changes: ExpenseUpdate) -> Expense | None: ...

    def delete(self, expense_id: str) -> bool: ...
