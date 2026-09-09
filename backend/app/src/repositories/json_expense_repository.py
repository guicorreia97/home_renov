# Deferred annotations: this module defines a `list` method, which would
# otherwise shadow the builtin in its own signatures.
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from overrides import override

from app.src.models.expense import Expense, ExpenseCreate, ExpenseUpdate
from app.src.repositories.expense_repository import ExpenseRepository
from app.src.repositories.json_store import JsonStore

COLLECTION = "expenses"


class JsonExpenseRepository(ExpenseRepository):
    """Expense storage backed by a JSON array on disk."""

    def __init__(self, data_dir: Path) -> None:
        self._store = JsonStore(data_dir, COLLECTION)

    @override
    def list(self) -> list[Expense]:
        return [Expense.model_validate(record) for record in self._read_records()]

    @override
    def get(self, expense_id: str) -> Expense | None:
        for record in self._read_records():
            if record.get("id") == expense_id:
                return Expense.model_validate(record)
        return None

    @override
    def add(self, expense: ExpenseCreate) -> Expense:
        now = datetime.now(UTC)
        created = Expense(
            id=str(uuid.uuid4()),
            created_at=now,
            updated_at=now,
            **expense.model_dump(),
        )

        records = self._read_records()
        records.append(created.model_dump(mode="json"))
        self._store.write(records)

        return created

    @override
    def update(self, expense_id: str, changes: ExpenseUpdate) -> Expense | None:
        records = self._read_records()
        for index, record in enumerate(records):
            if record.get("id") != expense_id:
                continue

            current = Expense.model_validate(record)
            updated = current.model_copy(
                update={
                    **changes.model_dump(exclude_unset=True),
                    "updated_at": datetime.now(UTC),
                }
            )
            records[index] = updated.model_dump(mode="json")
            self._store.write(records)

            return updated
        return None

    @override
    def delete(self, expense_id: str) -> bool:
        records = self._read_records()
        remaining = [record for record in records if record.get("id") != expense_id]
        if len(remaining) == len(records):
            return False

        self._store.write(remaining)
        return True

    def _read_records(self) -> list[dict[str, Any]]:
        return self._store.read(default=[])
