from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.src.repositories.budget_repository import BudgetRepository
from app.src.repositories.expense_repository import ExpenseRepository
from app.src.repositories.json_budget_repository import JsonBudgetRepository
from app.src.repositories.json_expense_repository import JsonExpenseRepository
from app.src.services.budget_service import BudgetService
from app.src.services.expense_service import ExpenseService
from config.settings import settings


@lru_cache
def get_expense_repository() -> ExpenseRepository:
    """The concrete store. Overridden in tests, and swapped for Mongo later."""
    return JsonExpenseRepository(settings.data_path)


@lru_cache
def get_budget_repository() -> BudgetRepository:
    return JsonBudgetRepository(settings.data_path)


def get_expense_service(
    repository: Annotated[ExpenseRepository, Depends(get_expense_repository)],
) -> ExpenseService:
    return ExpenseService(repository)


def get_budget_service(
    budget_repository: Annotated[BudgetRepository, Depends(get_budget_repository)],
    expense_repository: Annotated[ExpenseRepository, Depends(get_expense_repository)],
) -> BudgetService:
    return BudgetService(budget_repository, expense_repository, settings.CURRENCY)


ExpenseServiceDep = Annotated[ExpenseService, Depends(get_expense_service)]
BudgetServiceDep = Annotated[BudgetService, Depends(get_budget_service)]
