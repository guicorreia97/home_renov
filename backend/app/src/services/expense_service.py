# Deferred annotations: this module defines a `list` method, which would
# otherwise shadow the builtin in its own signatures.
from __future__ import annotations

from app.logging.log_config import log_config
from app.src.exceptions import EmptyUpdateError, ExpenseNotFoundError
from app.src.models.expense import Expense, ExpenseCreate, ExpenseUpdate
from app.src.repositories.expense_repository import ExpenseRepository

logger = log_config.get_logger()


class ExpenseService:
    """Expense use cases. Knows nothing about HTTP or about storage."""

    def __init__(self, repository: ExpenseRepository) -> None:
        self._repository = repository

    def list(self) -> list[Expense]:
        expenses = self._repository.list()
        logger.info("Listed expenses", extra={"expense_count": len(expenses)})

        return expenses

    def get(self, expense_id: str) -> Expense:
        expense = self._repository.get(expense_id)
        if expense is None:
            raise ExpenseNotFoundError(expense_id)

        return expense

    def create(self, payload: ExpenseCreate) -> Expense:
        expense = self._repository.add(payload)
        logger.info("Expense created", extra={"expense_id": expense.id})

        return expense

    def update(self, expense_id: str, changes: ExpenseUpdate) -> Expense:
        if not changes.model_fields_set:
            raise EmptyUpdateError

        expense = self._repository.update(expense_id, changes)
        if expense is None:
            raise ExpenseNotFoundError(expense_id)

        logger.info(
            "Expense updated",
            extra={"expense_id": expense.id, "changed_fields": sorted(changes.model_fields_set)},
        )

        return expense

    def delete(self, expense_id: str) -> None:
        if not self._repository.delete(expense_id):
            raise ExpenseNotFoundError(expense_id)

        logger.info("Expense deleted", extra={"expense_id": expense_id})
