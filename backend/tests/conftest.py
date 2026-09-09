from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_budget_repository, get_expense_repository
from app.api.main import app
from app.src.repositories.json_budget_repository import JsonBudgetRepository
from app.src.repositories.json_expense_repository import JsonExpenseRepository


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    app.dependency_overrides[get_expense_repository] = lambda: JsonExpenseRepository(tmp_path)
    app.dependency_overrides[get_budget_repository] = lambda: JsonBudgetRepository(tmp_path)

    yield TestClient(app)

    app.dependency_overrides.clear()
