from typing import Protocol

from app.src.models.budget import Budget, BudgetUpdate


class BudgetRepository(Protocol):
    """Storage contract for the single budget document."""

    def get(self) -> Budget: ...

    def update(self, changes: BudgetUpdate) -> Budget: ...
