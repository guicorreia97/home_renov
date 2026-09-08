from datetime import UTC, datetime
from pathlib import Path

from overrides import override

from app.src.models.budget import Budget, BudgetUpdate
from app.src.repositories.budget_repository import BudgetRepository
from app.src.repositories.json_store import JsonStore

COLLECTION = "budget"


class JsonBudgetRepository(BudgetRepository):
    """Budget storage backed by a single JSON object on disk."""

    def __init__(self, data_dir: Path) -> None:
        self._store = JsonStore(data_dir, COLLECTION)

    @override
    def get(self) -> Budget:
        record = self._store.read(default=None)
        if record is None:
            return Budget(updated_at=datetime.now(UTC))
        return Budget.model_validate(record)

    @override
    def update(self, changes: BudgetUpdate) -> Budget:
        current = self.get()
        updated = current.model_copy(
            update={
                **changes.model_dump(exclude_unset=True),
                "updated_at": datetime.now(UTC),
            }
        )
        self._store.write(updated.model_dump(mode="json"))

        return updated
