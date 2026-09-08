class DomainError(Exception):
    """Base class for errors the API layer translates into HTTP responses."""


class ExpenseNotFoundError(DomainError):
    """Raised when an expense id does not match any stored expense."""

    def __init__(self, expense_id: str) -> None:
        super().__init__(f"Expense {expense_id} was not found.")
        self.expense_id = expense_id


class EmptyUpdateError(DomainError):
    """Raised when an update request carries no fields to change."""

    def __init__(self) -> None:
        super().__init__("The update contained no fields to change.")
